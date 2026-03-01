"""
大纲相关 Schema
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime


class OutlineBase(BaseModel):
    """大纲基础 Schema"""
    content: Optional[str] = Field(None, description="大纲内容")
    sort_order: int = Field(default=0, description="同级排序")


class OutlineCreate(OutlineBase):
    """大纲创建 Schema"""
    outline_type: str = Field(..., description="大纲类型：main, unit, chapter")
    parent_id: Optional[str] = Field(None, description="父级大纲 ID")
    chapter_number: Optional[int] = Field(None, ge=1, description="章节号")


class OutlineUpdate(BaseModel):
    """大纲更新 Schema"""
    content: Optional[str] = None
    sort_order: Optional[int] = None


class OutlineResponse(OutlineBase):
    """大纲响应 Schema"""
    id: str
    project_id: str
    unit_id: Optional[str] = None
    outline_type: str
    parent_id: Optional[str] = None
    chapter_number: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
