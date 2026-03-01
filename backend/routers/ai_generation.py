"""
AI 生成路由
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from db.session import get_db
from routers.auth import get_current_user
from models.user import User
from utils.ai_client import get_ai_client
from pydantic import BaseModel, Field
from typing import Optional

router = APIRouter(prefix="/ai", tags=["AI 生成"])


class GenerateRequest(BaseModel):
    """生成请求"""
    prompt: str = Field(..., description="生成提示")
    system_prompt: Optional[str] = Field("你是一个专业的小说创作助手。", description="系统提示")
    context: Optional[str] = Field(None, description="上下文信息")
    temperature: Optional[float] = Field(0.7, ge=0, le=2, description="生成温度")


class ChapterGenerateRequest(BaseModel):
    """章节生成请求"""
    chapter_title: str = Field(..., description="章节标题")
    outline: Optional[str] = Field(None, description="本章大纲")
    previous_content: Optional[str] = Field(None, description="前文内容")
    character_notes: Optional[str] = Field(None, description="角色设定")
    style_guide: Optional[str] = Field(None, description="写作风格")


class ContinueRequest(BaseModel):
    """续写请求"""
    content: str = Field(..., description="已有内容")
    outline: Optional[str] = Field(None, description="大纲")
    length: str = Field("medium", description="续写长度：short/medium/long")


class RewriteRequest(BaseModel):
    """改写请求"""
    content: str = Field(..., description="原内容")
    instruction: str = Field(..., description="改写要求")


class ExpandRequest(BaseModel):
    """扩写请求"""
    content: str = Field(..., description="原内容")
    direction: Optional[str] = Field(None, description="扩写方向")


class GenerateResponse(BaseModel):
    """生成响应"""
    content: str


@router.post("/generate", response_model=GenerateResponse, summary="通用生成")
async def generate(
    request: GenerateRequest,
    current_user: User = Depends(get_current_user),
):
    """通用文本生成"""
    ai = get_ai_client()
    try:
        content = await ai.generate(
            prompt=request.prompt,
            system_prompt=request.system_prompt,
            context=request.context,
            temperature=request.temperature,
        )
        return {"content": content}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"生成失败：{str(e)}"
        )


@router.post("/generate/chapter", response_model=GenerateResponse, summary="生成章节")
async def generate_chapter(
    request: ChapterGenerateRequest,
    current_user: User = Depends(get_current_user),
):
    """生成章节内容"""
    ai = get_ai_client()
    try:
        content = await ai.generate_chapter(
            chapter_title=request.chapter_title,
            outline=request.outline,
            previous_content=request.previous_content,
            character_notes=request.character_notes,
            style_guide=request.style_guide,
        )
        return {"content": content}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"生成失败：{str(e)}"
        )


@router.post("/continue", response_model=GenerateResponse, summary="AI 续写")
async def continue_writing(
    request: ContinueRequest,
    current_user: User = Depends(get_current_user),
):
    """AI 续写"""
    ai = get_ai_client()
    try:
        content = await ai.continue_writing(
            content=request.content,
            outline=request.outline,
            length=request.length,
        )
        return {"content": content}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"续写失败：{str(e)}"
        )


@router.post("/rewrite", response_model=GenerateResponse, summary="AI 改写")
async def rewrite(
    request: RewriteRequest,
    current_user: User = Depends(get_current_user),
):
    """AI 改写"""
    ai = get_ai_client()
    try:
        content = await ai.rewrite(
            content=request.content,
            instruction=request.instruction,
        )
        return {"content": content}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"改写失败：{str(e)}"
        )


@router.post("/expand", response_model=GenerateResponse, summary="AI 扩写")
async def expand(
    request: ExpandRequest,
    current_user: User = Depends(get_current_user),
):
    """AI 扩写"""
    ai = get_ai_client()
    try:
        content = await ai.expand(
            content=request.content,
            direction=request.direction,
        )
        return {"content": content}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"扩写失败：{str(e)}"
        )
