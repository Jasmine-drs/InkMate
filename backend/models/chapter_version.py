"""
章节版本模型
"""
from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey, Index
from sqlalchemy.sql import func
from db.session import Base
import uuid


class ChapterVersion(Base):
    """章节版本表"""
    __tablename__ = "chapter_versions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    chapter_id = Column(String(36), ForeignKey("chapters.id", ondelete="CASCADE"), index=True, nullable=False)
    version_number = Column(Integer, nullable=False)  # 版本号
    content = Column(Text)  # 该版本正文
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index('idx_chapter_id', 'chapter_id'),
    )

    def __repr__(self):
        return f"<ChapterVersion {self.version_number}>"
