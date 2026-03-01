"""
状态追踪相关 Schema
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum


class TrackingType(str, Enum):
    """追踪类型枚举"""
    CHARACTER_STATE = "character_state"  # 角色状态
    FORESHADOWING = "foreshadowing"  # 伏笔
    ITEM = "item"  # 物品
    TIMELINE = "timeline"  # 时间线
    UNIT_PROGRESS = "unit_progress"  # 单元进度


class TrackingBase(BaseModel):
    """状态追踪基础 Schema"""
    tracking_type: TrackingType = Field(..., description="追踪类型")
    entity_id: Optional[str] = Field(None, description="关联实体 ID（角色/物品/单元等）")
    chapter_number: Optional[int] = Field(None, description="来源章节号")
    state_data: Optional[Dict[str, Any]] = Field(None, description="状态数据")


class TrackingCreate(TrackingBase):
    """状态追踪创建 Schema"""
    pass


class TrackingUpdate(BaseModel):
    """状态追踪更新 Schema"""
    tracking_type: Optional[TrackingType] = None
    entity_id: Optional[str] = None
    chapter_number: Optional[int] = None
    state_data: Optional[Dict[str, Any]] = None


class TrackingResponse(TrackingBase):
    """状态追踪响应 Schema"""
    id: str
    project_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TrackingExtractRequest(BaseModel):
    """从章节提取状态更新请求"""
    chapter_ids: list[str] = Field(..., description="章节 ID 列表")
    tracking_types: Optional[list[TrackingType]] = Field(None, description="要提取的追踪类型")


class TrackingExtractResult(BaseModel):
    """从章节提取状态更新结果"""
    chapter_id: str
    chapter_title: str
    extracted_trackings: list[TrackingCreate] = Field(default_factory=list)
