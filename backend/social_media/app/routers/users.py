from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile
from sqlalchemy import exists, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
import json

from app.core.permissions import is_admin_role
from app.database.database import get_db
from app.dependencies import get_current_user
from app.models.block import Block
from app.models.user import User
from app.models.profile_image import ProfileImage
from app.models.user_preferences import UserPreferences
from app.schemas.preferences import PreferencesRead, PreferencesUpdate
from app.schemas.user import PasswordUpdate, UserUpdate
from app.core.security import hash_password, verify_password
from app.services.follow_service import get_follow_counts, get_followed_ids, is_following
from app.services.user_service import serialize_public_user, serialize_user
from sqlalchemy.exc import IntegrityError

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me/preferences", response_model=PreferencesRead)
async def get_preferences(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
	prefs = await db.get(UserPreferences, current_user.id)
	if prefs is None:
		prefs = UserPreferences(user_id=current_user.id)
		db.add(prefs)
		await db.commit()
		await db.refresh(prefs)
	return prefs


@router.put("/me/preferences", response_model=PreferencesRead)
async def update_preferences(data: PreferencesUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
	prefs = await db.get(UserPreferences, current_user.id)
	if prefs is None:
		prefs = UserPreferences(user_id=current_user.id)
		db.add(prefs)
	for key, value in data.model_dump().items():
		setattr(prefs, key, value)
	await db.commit()
	await db.refresh(prefs)
	return prefs


@router.get("/search")
async def search_users(
	query: str = Query(default="", min_length=0, max_length=50),
	limit: int = Query(default=20, ge=1, le=50),
	current_user: User = Depends(get_current_user),
	db: AsyncSession = Depends(get_db),
):
	statement = select(User).where(
		User.id != current_user.id,
		User.account_status == "active",
		~exists(
			select(Block.id).where(
				or_(
					(Block.blocker_id == current_user.id) & (Block.blocked_id == User.id),
					(Block.blocker_id == User.id) & (Block.blocked_id == current_user.id),
				)
			)
		),
	)
	if query.strip():
		pattern = f"%{query.strip()}%"
		statement = statement.where(
			or_(
				User.username.ilike(pattern),
				User.display_name.ilike(pattern),
				User.headline.ilike(pattern),
				User.bio.ilike(pattern),
				User.skills.ilike(pattern),
			)
		)

	result = await db.execute(statement.order_by(User.username).limit(limit))
	users = result.scalars().all()
	followed = await get_followed_ids(db, current_user.id, [user.id for user in users])
	return [
		{**serialize_public_user(user), "is_following": user.id in followed}
		for user in users
	]


@router.get("/me")
async def get_me(
	current_user: User = Depends(get_current_user),
	db: AsyncSession = Depends(get_db),
):
	follower_count, following_count = await get_follow_counts(db, current_user.id)
	return {
		**serialize_user(current_user),
		"follower_count": follower_count,
		"following_count": following_count,
	}


@router.patch("/me")
async def update_me(
	user_data: UserUpdate,
	current_user: User = Depends(get_current_user),
	db: AsyncSession = Depends(get_db),
):
	updates = user_data.model_dump(exclude_unset=True)

	if "username" in updates:
		existing = await db.execute(
			select(User).where(User.username == updates["username"], User.id != current_user.id)
		)
		if existing.scalar_one_or_none() is not None:
			raise HTTPException(status_code=409, detail="Username already registered")
		current_user.username = updates["username"]

	if "name" in updates:
		current_user.display_name = updates["name"]
	if "bio" in updates:
		current_user.bio = updates["bio"]
	if "headline" in updates:
		current_user.headline = updates["headline"]
	if "category" in updates:
		current_user.category = updates["category"]
	if "skills" in updates:
		current_user.skills = json.dumps(updates["skills"])
	if "github_url" in updates:
		current_user.github_url = updates["github_url"]
	if "portfolio_url" in updates:
		current_user.portfolio_url = updates["portfolio_url"]
	if "linkedin_url" in updates:
		current_user.linkedin_url = updates["linkedin_url"]
	if "location" in updates:
		current_user.location = updates["location"]
	if "available_for_work" in updates:
		current_user.available_for_work = updates["available_for_work"]
	if "onboarded" in updates:
		current_user.onboarded = updates["onboarded"]

	try:
		await db.commit()
	except IntegrityError:
		await db.rollback()
		raise HTTPException(status_code=409, detail="Username already registered")
	await db.refresh(current_user)
	follower_count, following_count = await get_follow_counts(db, current_user.id)
	return {
		**serialize_user(current_user),
		"follower_count": follower_count,
		"following_count": following_count,
	}


@router.patch("/me/password", status_code=204)
async def update_password(
	password_data: PasswordUpdate,
	current_user: User = Depends(get_current_user),
	db: AsyncSession = Depends(get_db),
):
	if not verify_password(password_data.current_password, current_user.password):
		raise HTTPException(status_code=400, detail="Current password is incorrect")

	current_user.password = hash_password(password_data.new_password)
	await db.commit()


@router.post("/me/avatar", status_code=201)
async def upload_avatar(
	image: UploadFile = File(...),
	current_user: User = Depends(get_current_user),
	db: AsyncSession = Depends(get_db),
):
	allowed_types = {"image/jpeg", "image/png", "image/webp", "image/gif"}
	if image.content_type not in allowed_types:
		raise HTTPException(status_code=415, detail="Upload a JPEG, PNG, WebP, or GIF image")

	data = await image.read(5 * 1024 * 1024 + 1)
	if len(data) > 5 * 1024 * 1024:
		raise HTTPException(status_code=413, detail="Profile image must be 5 MB or smaller")
	valid_signatures = {
		"image/jpeg": data.startswith(b"\xff\xd8\xff"),
		"image/png": data.startswith(b"\x89PNG\r\n\x1a\n"),
		"image/gif": data.startswith((b"GIF87a", b"GIF89a")),
		"image/webp": len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP",
	}
	if not valid_signatures[image.content_type]:
		raise HTTPException(status_code=415, detail="The uploaded file content does not match its image type")

	profile_image = await db.get(ProfileImage, current_user.id)
	if profile_image is None:
		profile_image = ProfileImage(
			user_id=current_user.id,
			content_type=image.content_type,
			data=data,
		)
		db.add(profile_image)
	else:
		profile_image.content_type = image.content_type
		profile_image.data = data

	await db.commit()
	return {"avatar_url": f"/users/{current_user.id}/avatar"}


@router.get("/{user_id}/avatar")
async def get_avatar(user_id: int, db: AsyncSession = Depends(get_db)):
	profile_image = await db.get(ProfileImage, user_id)
	if profile_image is None:
		raise HTTPException(status_code=404, detail="Profile image not found")
	return Response(content=profile_image.data, media_type=profile_image.content_type)


@router.delete("/me/avatar", status_code=204)
async def delete_avatar(
	current_user: User = Depends(get_current_user),
	db: AsyncSession = Depends(get_db),
):
	profile_image = await db.get(ProfileImage, current_user.id)
	if profile_image is not None:
		await db.delete(profile_image)
		await db.commit()


@router.get("/{username}")
async def get_user_by_username(
	username: str,
	current_user: User = Depends(get_current_user),
	db: AsyncSession = Depends(get_db),
):
	result = await db.execute(select(User).where(User.username == username))
	user = result.scalar_one_or_none()
	if user is None:
		raise HTTPException(status_code=404, detail="User not found")
	if user.account_status != "active" and not is_admin_role(current_user.role):
		raise HTTPException(status_code=404, detail="User not found")
	follower_count, following_count = await get_follow_counts(db, user.id)
	following = await is_following(db, current_user.id, user.id)
	return {
		**serialize_public_user(user, is_following=following),
		"follower_count": follower_count,
		"following_count": following_count,
	}
