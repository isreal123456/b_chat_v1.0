from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.database import get_db
from app.dependencies import get_current_user
from app.models.post import Post
from app.models.save import Save
from app.models.user import User

router = APIRouter(prefix="/saves", tags=["saves"])


@router.post("/{post_id}", status_code=status.HTTP_201_CREATED)
async def save_post(
	post_id: int,
	current_user: User = Depends(get_current_user),
	db: AsyncSession = Depends(get_db),
):
	post = await db.get(Post, post_id)
	if post is None:
		raise HTTPException(status_code=404, detail="Post not found")

	result = await db.execute(
		select(Save).where(
			Save.post_id == post_id,
			Save.user_id == current_user.id,
		)
	)
	if result.scalar_one_or_none() is not None:
		raise HTTPException(status_code=400, detail="Post already saved")

	saved_post = Save(post_id=post_id, user_id=current_user.id)
	db.add(saved_post)
	try:
		await db.commit()
	except IntegrityError:
		await db.rollback()
		raise HTTPException(status_code=400, detail="Post already saved")
	await db.refresh(saved_post)

	return {"message": "Post saved successfully", "save_id": saved_post.id}


@router.delete("/{post_id}", status_code=status.HTTP_200_OK)
async def unsave_post(
	post_id: int,
	current_user: User = Depends(get_current_user),
	db: AsyncSession = Depends(get_db),
):
	result = await db.execute(
		select(Save).where(
			Save.post_id == post_id,
			Save.user_id == current_user.id,
		)
	)
	saved_post = result.scalar_one_or_none()
	if saved_post is None:
		raise HTTPException(status_code=404, detail="Post is not saved")

	await db.delete(saved_post)
	await db.commit()
	return {"message": "Post unsaved successfully"}


@router.get("", status_code=status.HTTP_200_OK)
async def get_saved_posts(
	current_user: User = Depends(get_current_user),
	db: AsyncSession = Depends(get_db),
):
	result = await db.execute(
		select(Save)
		.where(Save.user_id == current_user.id)
		.order_by(Save.created_at.desc())
	)
	return result.scalars().all()
