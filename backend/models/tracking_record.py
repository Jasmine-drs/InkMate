"""
状态追踪模型
"""
from sqlalchemy import Column, String, JSON, Integer, DateTime, ForeignKey, Index
from sqlalchemy.sql import func
from db.session import Base
import uuid


class TrackingRecord(Base):
    """状态追踪表（角色状态、伏笔、物品、时间线等）"""
    __tablename__ = "tracking_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False)
    tracking_type = Column(String(50), nullable=False)  # character_state, foreshadowing, item, timeline, unit_progress
    entity_id = Column(String(36))  # 关联实体 ID（角色/物品/单元等）
    chapter_number = Column(Integer)  # 来源章节号
    state_data = Column(JSON)  # 状态数据
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index('idx_project_id', 'project_id'),
        Index('idx_tracking_type', 'project_id', 'tracking_type'),
        Index('idx_entity', 'entity_id'),
    )

    def __repr__(self):
        return f"<TrackingRecord {self.tracking_type}>"
