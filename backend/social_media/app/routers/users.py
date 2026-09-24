from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.profile_image import ProfileImage
from app.schemas.user import PasswordUpdate, UserUpdate
from app.core.security import hash_password, verify_password
from sqlalchemy.exc import IntegrityError

router = APIRouter(prefix="/users", tags=["users"])


def serialize_user(user: User) -> dict:
	return {
		"id": user.id,
		"username": user.username,
		"email": user.email,
		"name": user.username,
		"avatar_url": f"/users/{user.id}/avatar",
	}


@router.get("/search")
async def search_users(
	query: str = Query(default="", min_length=0, max_length=50),
	current_user: User = Depends(get_current_user),
	db: AsyncSession = Depends(get_db),
):
	statement = select(User).where(User.id != current_user.id)
	if query.strip():
		pattern = f"%{query.strip()}%"
		statement = statement.where(
			or_(User.username.ilike(pattern), User.email.ilike(pattern))
		)

	result = await db.execute(statement.order_by(User.username).limit(20))
	return [serialize_user(user) for user in result.scalars().all()]


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
	return serialize_user(current_user)


@router.patch("/me")
async def update_me(
	user_data: UserUpdate,
	current_user: User = Depends(get_current_user),
	db: AsyncSession = Depends(get_db),
):
	existing = await db.execute(
		select(User).where(User.username == user_data.username, User.id != current_user.id)
	)
	if existing.scalar_one_or_none() is not None:
		raise HTTPException(status_code=409, detail="Username already registered")

	current_user.username = user_data.username.strip()
	try:
		await db.commit()
	except IntegrityError:
		await db.rollback()
		raise HTTPException(status_code=409, detail="Username already registered")
	await db.refresh(current_user)
	return serialize_user(current_user)


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
	return serialize_user(user)
