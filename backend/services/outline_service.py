"""
大纲管理服务
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from models.outline import Outline
from schemas.outline import OutlineCreate, OutlineUpdate


class OutlineService:
    """大纲服务"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_outline(
        self, project_id: str, outline_data: OutlineCreate, unit_id: str | None = None
    ) -> Outline:
        """创建大纲"""
        outline = Outline(
            project_id=project_id,
            unit_id=unit_id,
            **outline_data.model_dump(),
        )
        self.db.add(outline)
        await self.db.commit()
        await self.db.refresh(outline)
        return outline

    async def get_outline(
        self, project_id: str, outline_id: str
    ) -> Outline | None:
        """获取大纲详情"""
        result = await self.db.execute(
            select(Outline).where(
                Outline.id == outline_id,
                Outline.project_id == project_id
            )
        )
        return result.scalar_one_or_none()

    async def get_project_outlines(
        self, project_id: str, outline_type: str | None = None,
        unit_id: str | None = None, skip: int = 0, limit: int = 50
    ) -> tuple[list[Outline], int]:
        """获取项目的大纲列表"""
        # 构建查询条件
        conditions = [Outline.project_id == project_id]
        if outline_type:
            conditions.append(Outline.outline_type == outline_type)
        if unit_id:
            conditions.append(Outline.unit_id == unit_id)

        # 获取总数
        count_result = await self.db.execute(
            select(func.count()).select_from(Outline).where(*conditions)
        )
        total = count_result.scalar() or 0

        # 获取大纲列表
        result = await self.db.execute(
            select(Outline)
            .where(*conditions)
            .order_by(Outline.sort_order.asc(), Outline.created_at.asc())
            .offset(skip)
            .limit(limit)
        )
        outlines = result.scalars().all()
        return list(outlines), total

    async def update_outline(
        self, project_id: str, outline_id: str, outline_data: OutlineUpdate
    ) -> Outline | None:
        """更新大纲"""
        result = await self.db.execute(
            select(Outline).where(
                Outline.id == outline_id,
                Outline.project_id == project_id
            )
        )
        outline = result.scalar_one_or_none()
        if not outline:
            return None

        update_data = outline_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(outline, key, value)

        await self.db.commit()
        await self.db.refresh(outline)
        return outline

    async def delete_outline(
        self, project_id: str, outline_id: str
    ) -> bool:
        """删除大纲"""
        result = await self.db.execute(
            select(Outline).where(
                Outline.id == outline_id,
                Outline.project_id == project_id
            )
        )
        outline = result.scalar_one_or_none()
        if not outline:
            return False

        await self.db.delete(outline)
        await self.db.commit()
        return True
