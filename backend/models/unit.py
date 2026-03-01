"""
单元模型（单元剧专用）
"""
from sqlalchemy import Column, String, Integer, JSON, DateTime, ForeignKey, Index
from sqlalchemy.sql import func
from db.session import Base
import uuid


class Unit(Base):
    """单元表（单元剧专用）"""
    __tablename__ = "units"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False)
    unit_number = Column(Integer, nullable=False)
    title = Column(String(200))
    unit_type = Column(String(50))  # standalone, mainline_related, transition
    start_chapter = Column(Integer)
    end_chapter = Column(Integer)
    settings = Column(JSON)  # 单元专属设定
    outline = Column(JSON)  # 单元大纲
    status = Column(String(20), default="planning")  # planning, in_progress, completed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index('idx_project_id', 'project_id'),
    )

    def __repr__(self):
        return f"<Unit {self.unit_number}>"
