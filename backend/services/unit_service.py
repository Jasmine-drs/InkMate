"""
单元管理服务
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from models.unit import Unit
from schemas.unit import UnitCreate, UnitUpdate


class UnitService:
    """单元服务"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_unit(
        self, project_id: str, unit_data: UnitCreate
    ) -> Unit:
        """创建单元"""
        unit = Unit(
            project_id=project_id,
            **unit_data.model_dump(),
        )
        self.db.add(unit)
        await self.db.commit()
        await self.db.refresh(unit)
        return unit

    async def get_unit(
        self, project_id: str, unit_id: str
    ) -> Unit | None:
        """获取单元详情"""
        result = await self.db.execute(
            select(Unit).where(
                Unit.id == unit_id,
                Unit.project_id == project_id
            )
        )
        return result.scalar_one_or_none()

    async def get_project_units(
        self, project_id: str, skip: int = 0, limit: int = 50
    ) -> tuple[list[Unit], int]:
        """获取项目的单元列表"""
        # 获取总数
        count_result = await self.db.execute(
            select(func.count()).where(Unit.project_id == project_id)
        )
        total = count_result.scalar() or 0

        # 获取单元列表
        result = await self.db.execute(
            select(Unit)
            .where(Unit.project_id == project_id)
            .order_by(Unit.unit_number.asc())
            .offset(skip)
            .limit(limit)
        )
        units = result.scalars().all()
        return list(units), total

    async def update_unit(
        self, project_id: str, unit_id: str, unit_data: UnitUpdate
    ) -> Unit | None:
        """更新单元"""
        result = await self.db.execute(
            select(Unit).where(
                Unit.id == unit_id,
                Unit.project_id == project_id
            )
        )
        unit = result.scalar_one_or_none()
        if not unit:
            return None

        update_data = unit_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(unit, key, value)

        await self.db.commit()
        await self.db.refresh(unit)
        return unit

    async def delete_unit(
        self, project_id: str, unit_id: str
    ) -> bool:
        """删除单元"""
        result = await self.db.execute(
            select(Unit).where(
                Unit.id == unit_id,
                Unit.project_id == project_id
            )
        )
        unit = result.scalar_one_or_none()
        if not unit:
            return False

        await self.db.delete(unit)
        await self.db.commit()
        return True
