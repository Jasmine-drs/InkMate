"""
章节相关 Schema
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ChapterBase(BaseModel):
    """章节基础 Schema"""
    title: Optional[str] = Field(None, max_length=200, description="章节标题")
    content: Optional[str] = Field(None, description="正文内容")
    chapter_guidance: Optional[str] = Field(None, description="本章写作指导")


class ChapterCreate(ChapterBase):
    """章节创建 Schema"""
    chapter_number: int = Field(..., ge=1, description="章节序号")


class ChapterUpdate(BaseModel):
    """章节更新 Schema"""
    title: Optional[str] = Field(None, max_length=200)
    content: Optional[str] = None
    chapter_guidance: Optional[str] = None
    status: Optional[str] = None


class ChapterResponse(ChapterBase):
    """章节响应 Schema"""
    id: str
    project_id: str
    unit_id: Optional[str] = None
    chapter_number: int
    word_count: int
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ChapterVersionResponse(BaseModel):
    """章节版本响应 Schema"""
    id: str
    chapter_id: str
    version_number: int
    content: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
