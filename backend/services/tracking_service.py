"""
状态追踪服务
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from models.tracking_record import TrackingRecord
from schemas.tracking import TrackingCreate, TrackingUpdate, TrackingType


class TrackingService:
    """状态追踪服务"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_tracking(
        self, project_id: str, tracking_data: TrackingCreate
    ) -> TrackingRecord:
        """创建状态追踪记录"""
        tracking = TrackingRecord(
            project_id=project_id,
            **tracking_data.model_dump(),
        )
        self.db.add(tracking)
        await self.db.commit()
        await self.db.refresh(tracking)
        return tracking

    async def get_tracking(
        self, project_id: str, tracking_id: str
    ) -> TrackingRecord | None:
        """获取单条追踪记录"""
        result = await self.db.execute(
            select(TrackingRecord).where(
                TrackingRecord.id == tracking_id,
                TrackingRecord.project_id == project_id
            )
        )
        return result.scalar_one_or_none()

    async def get_project_trackings(
        self, project_id: str,
        tracking_type: TrackingType | None = None,
        entity_id: str | None = None,
        skip: int = 0,
        limit: int = 50
    ) -> tuple[list[TrackingRecord], int]:
        """获取项目的追踪记录列表

        Args:
            project_id: 项目 ID
            tracking_type: 追踪类型过滤（可选）
            entity_id: 实体 ID 过滤（可选）
            skip: 跳过记录数
            limit: 返回记录数限制

        Returns:
            (追踪记录列表，总记录数)
        """
        # 构建基础查询
        base_query = select(TrackingRecord).where(
            TrackingRecord.project_id == project_id
        )

        # 添加类型过滤
        if tracking_type:
            base_query = base_query.where(TrackingRecord.tracking_type == tracking_type.value)

        # 添加实体 ID 过滤
        if entity_id:
            base_query = base_query.where(TrackingRecord.entity_id == entity_id)

        # 获取总数
        count_query = select(func.count()).select_from(base_query.subquery())
        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0

        # 获取记录列表
        query = base_query.order_by(TrackingRecord.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(query)
        trackings = result.scalars().all()

        return list(trackings), total

    async def get_trackings_by_entity(
        self, project_id: str, entity_id: str
    ) -> list[TrackingRecord]:
        """获取实体的所有追踪记录"""
        result = await self.db.execute(
            select(TrackingRecord).where(
                TrackingRecord.project_id == project_id,
                TrackingRecord.entity_id == entity_id
            ).order_by(TrackingRecord.created_at.asc())
        )
        return list(result.scalars().all())

    async def update_tracking(
        self, project_id: str, tracking_id: str, tracking_data: TrackingUpdate
    ) -> TrackingRecord | None:
        """更新追踪记录"""
        result = await self.db.execute(
            select(TrackingRecord).where(
                TrackingRecord.id == tracking_id,
                TrackingRecord.project_id == project_id
            )
        )
        tracking = result.scalar_one_or_none()
        if not tracking:
            return None

        update_data = tracking_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(tracking, key, value)

        await self.db.commit()
        await self.db.refresh(tracking)
        return tracking

    async def delete_tracking(
        self, project_id: str, tracking_id: str
    ) -> bool:
        """删除追踪记录"""
        result = await self.db.execute(
            select(TrackingRecord).where(
                TrackingRecord.id == tracking_id,
                TrackingRecord.project_id == project_id
            )
        )
        tracking = result.scalar_one_or_none()
        if not tracking:
            return False

        await self.db.delete(tracking)
        await self.db.commit()
        return True

    async def get_latest_tracking(
        self, project_id: str, tracking_type: TrackingType, entity_id: str
    ) -> TrackingRecord | None:
        """获取实体最新的追踪记录"""
        result = await self.db.execute(
            select(TrackingRecord).where(
                TrackingRecord.project_id == project_id,
                TrackingRecord.tracking_type == tracking_type.value,
                TrackingRecord.entity_id == entity_id
            ).order_by(TrackingRecord.created_at.desc()).limit(1)
        )
        return result.scalar_one_or_none()
