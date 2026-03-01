"""
AI 对话消息模型
"""
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Index
from sqlalchemy.sql import func
from db.session import Base
import uuid


class ChatMessage(Base):
    """AI 对话记录表"""
    __tablename__ = "chat_messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False)
    chapter_id = Column(String(36), ForeignKey("chapters.id", ondelete="SET NULL"), index=True)  # 关联章节（可选）
    role = Column(String(20), nullable=False)  # user, assistant
    content = Column(Text)  # 消息内容
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index('idx_project_id', 'project_id'),
        Index('idx_chapter_id', 'chapter_id'),
        Index('idx_created', 'project_id', 'created_at'),
    )

    def __repr__(self):
        return f"<ChatMessage {self.role}>"
