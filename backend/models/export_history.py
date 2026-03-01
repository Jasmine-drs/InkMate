"""
导出历史模型
"""
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Index, Enum
from sqlalchemy.sql import func
from db.session import Base
import uuid
import enum


class ExportFormat(str, enum.Enum):
    """导出格式"""
    TXT = "txt"
    EPUB = "epub"
    DOCX = "docx"


class ExportHistory(Base):
    """导出历史记录表"""
    __tablename__ = "export_history"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    format = Column(String(20), nullable=False)  # txt, epub, docx
    file_name = Column(String(255), nullable=False)
    file_size = Column(Integer, default=0)  # 文件大小（字节）
    chapter_count = Column(Integer, default=0)  # 包含章节数
    is_batch = Column(Integer, default=0)  # 是否为批量导出
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index('idx_user_project', 'user_id', 'project_id'),
        Index('idx_created_at', 'created_at'),
    )

    def __repr__(self):
        return f"<ExportHistory {self.file_name}>"
