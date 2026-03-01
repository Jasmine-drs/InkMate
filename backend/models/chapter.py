"""
章节模型
"""
from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from db.session import Base
import uuid


class Chapter(Base):
    """章节表"""
    __tablename__ = "chapters"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False)
    unit_id = Column(String(36), ForeignKey("units.id", ondelete="SET NULL"), index=True)
    chapter_number = Column(Integer, nullable=False)
    title = Column(String(200))
    content = Column(Text)
    word_count = Column(Integer, default=0)
    status = Column(String(20), default="draft")  # draft, finalized
    chapter_guidance = Column(Text)  # 本章写作指导
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint('project_id', 'chapter_number', name='uk_project_chapter'),
    )

    def __repr__(self):
        return f"<Chapter {self.chapter_number}>"
