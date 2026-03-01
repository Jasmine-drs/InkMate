"""
大纲模型
"""
from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey, Index
from sqlalchemy.sql import func
from db.session import Base
import uuid


class Outline(Base):
    """大纲表（主线大纲、单元大纲、章节细纲）"""
    __tablename__ = "outlines"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False)
    unit_id = Column(String(36), ForeignKey("units.id", ondelete="SET NULL"), index=True)  # 单元大纲时非空
    outline_type = Column(String(20), nullable=False)  # main=主线大纲，unit=单元大纲，chapter=章节细纲
    parent_id = Column(String(36), ForeignKey("outlines.id", ondelete="CASCADE"), index=True)  # 父级大纲 ID
    chapter_number = Column(Integer)  # 章节号，仅章节细纲时使用
    sort_order = Column(Integer, default=0)  # 同级排序
    content = Column(Text)  # 大纲内容
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index('idx_project_id', 'project_id'),
        Index('idx_unit_id', 'unit_id'),
        Index('idx_parent_id', 'parent_id'),
        Index('idx_chapter', 'project_id', 'chapter_number'),
    )

    def __repr__(self):
        return f"<Outline {self.outline_type}>"
