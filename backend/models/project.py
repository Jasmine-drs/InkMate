"""
项目模型
"""
from sqlalchemy import Column, String, Text, JSON, DateTime, Index, Boolean
from sqlalchemy.sql import func
from db.session import Base
import uuid


class Project(Base):
    """项目表"""
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), index=True, nullable=False)
    title = Column(String(200), nullable=False)
    genre = Column(String(50))
    type = Column(String(20), default="novel")  # novel, unit_drama
    description = Column(Text)
    settings = Column(JSON)  # 世界观设定
    cover_url = Column(String(500))
    is_public = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index('idx_user_id', 'user_id'),
    )

    def __repr__(self):
        return f"<Project {self.title}>"
