"""
AI 对话相关 Schema
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class ChatMessageCreate(BaseModel):
    """对话消息创建 Schema"""
    project_id: str = Field(..., description="项目 ID")
    chapter_id: Optional[str] = Field(None, description="章节 ID（可选）")
    role: str = Field(..., description="消息角色：user, assistant")
    content: str = Field(..., description="消息内容")


class ChatMessageResponse(BaseModel):
    """对话消息响应 Schema"""
    id: str
    project_id: str
    chapter_id: Optional[str] = None
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class ChatRequest(BaseModel):
    """对话请求 Schema"""
    prompt: str = Field(..., description="用户输入的问题或提示")
    project_id: str = Field(..., description="项目 ID")
    chapter_id: Optional[str] = Field(None, description="章节 ID（可选）")
    context_type: Optional[str] = Field("general", description="上下文类型：general, creation, setting, inspiration, diagnosis")
    system_prompt: Optional[str] = Field(None, description="自定义系统提示（可选）")


class ChatHistoryResponse(BaseModel):
    """对话历史响应 Schema"""
    messages: List[ChatMessageResponse] = Field(default_factory=list, description="对话消息列表")
    total: int = Field(..., description="消息总数")


class ChatStreamResponse(BaseModel):
    """对话流式响应 Schema（用于错误情况）"""
    error: Optional[str] = Field(None, description="错误信息")
    message_id: Optional[str] = Field(None, description="消息 ID")
