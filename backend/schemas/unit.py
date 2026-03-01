"""
单元相关 Schema
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime


class UnitBase(BaseModel):
    """单元基础 Schema"""
    title: Optional[str] = Field(None, max_length=200, description="单元标题")
    unit_type: Optional[str] = Field(None, description="单元类型：standalone, mainline_related, transition")
    start_chapter: Optional[int] = Field(None, ge=1, description="起始章节号")
    end_chapter: Optional[int] = Field(None, ge=1, description="结束章节号")
    settings: Optional[Dict[str, Any]] = Field(None, description="单元专属设定")
    outline: Optional[Dict[str, Any]] = Field(None, description="单元大纲")


class UnitCreate(UnitBase):
    """单元创建 Schema"""
    unit_number: int = Field(..., ge=1, description="单元序号")


class UnitUpdate(BaseModel):
    """单元更新 Schema"""
    title: Optional[str] = Field(None, max_length=200)
    unit_type: Optional[str] = None
    start_chapter: Optional[int] = None
    end_chapter: Optional[int] = None
    settings: Optional[Dict[str, Any]] = None
    outline: Optional[Dict[str, Any]] = None
    status: Optional[str] = None


class UnitResponse(UnitBase):
    """单元响应 Schema"""
    id: str
    project_id: str
    unit_number: int
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
