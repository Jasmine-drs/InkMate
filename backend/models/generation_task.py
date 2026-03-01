"""
AI 生成任务模型
"""
from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey, Index
from sqlalchemy.sql import func
from db.session import Base
import uuid


class GenerationTask(Base):
    """AI 生成任务表"""
    __tablename__ = "generation_tasks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False)
    unit_id = Column(String(36), ForeignKey("units.id", ondelete="SET NULL"))  # 单元 ID（可选）
    chapter_id = Column(String(36), ForeignKey("chapters.id", ondelete="SET NULL"))  # 章节 ID（可选）
    task_type = Column(String(30), nullable=False)  # chapter=章节生成，continue=续写，rewrite=改写，expand=扩写，outline=大纲，character=角色卡
    status = Column(String(20), default="pending")  # pending, running, completed, failed, cancelled
    prompt = Column(Text)  # 生成提示词
    result = Column(Text)  # 生成结果
    error_message = Column(Text)  # 错误信息
    tokens_used = Column(Integer)  # 消耗的 token 数
    model_name = Column(String(50))  # 使用的 AI 模型名称
    progress = Column(Integer, default=0)  # 进度百分比 0-100
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    completed_at = Column(DateTime(timezone=True))  # 完成时间

    __table_args__ = (
        Index('idx_project_id', 'project_id'),
        Index('idx_status', 'status'),
        Index('idx_task_type', 'task_type'),
    )

    def __repr__(self):
        return f"<GenerationTask {self.task_type}>"
