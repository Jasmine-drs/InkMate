"""
角色模型
"""
from sqlalchemy import Column, String, JSON, DateTime, ForeignKey, Index
from sqlalchemy.sql import func
from db.session import Base
import uuid


class Character(Base):
    """角色表"""
    __tablename__ = "characters"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False)
    name = Column(String(100), nullable=False)
    role_type = Column(String(20))  # protagonist, supporting, unit_character
    card_data = Column(JSON)  # 完整角色卡数据
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index('idx_project_id', 'project_id'),
    )

    def __repr__(self):
        return f"<Character {self.name}>"
