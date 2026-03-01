"""
项目相关 Schema
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ProjectBase(BaseModel):
    """项目基础 Schema"""
    title: str = Field(..., min_length=1, max_length=200, description="项目标题")
    genre: Optional[str] = Field(None, max_length=50, description="类型/题材")
    type: str = Field(default="novel", description="项目类型：novel, unit_drama")
    description: Optional[str] = Field(None, description="项目简介")
    settings: Optional[dict] = Field(None, description="世界观设定")


class ProjectCreate(ProjectBase):
    """项目创建 Schema"""
    pass


class ProjectUpdate(BaseModel):
    """项目更新 Schema"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    genre: Optional[str] = Field(None, max_length=50)
    type: Optional[str] = None
    description: Optional[str] = None
    settings: Optional[dict] = None
    cover_url: Optional[str] = None
    is_public: Optional[bool] = None


class ProjectResponse(ProjectBase):
    """项目响应 Schema"""
    id: str
    user_id: str
    cover_url: Optional[str] = None
    is_public: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
