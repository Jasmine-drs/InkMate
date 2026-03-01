"""
角色相关 Schema
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime


class CharacterBase(BaseModel):
    """角色基础 Schema"""
    name: str = Field(..., min_length=1, max_length=100, description="角色姓名")
    role_type: Optional[str] = Field(None, description="角色类型：protagonist, supporting, unit_character")
    card_data: Optional[Dict[str, Any]] = Field(None, description="角色卡数据")


class CharacterCreate(CharacterBase):
    """角色创建 Schema"""
    pass


class CharacterUpdate(BaseModel):
    """角色更新 Schema"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    role_type: Optional[str] = None
    card_data: Optional[Dict[str, Any]] = None


class CharacterResponse(CharacterBase):
    """角色响应 Schema"""
    id: str
    project_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
