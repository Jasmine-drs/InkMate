"""
AI 生成路由
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from db.session import get_db
from routers.auth import get_current_user
from models.user import User
from utils.ai_client import get_ai_client
from pydantic import BaseModel, Field
from typing import Optional, AsyncGenerator
import json
import time
from loguru import logger
from config import settings

router = APIRouter(prefix="/ai", tags=["AI 生成"])


async def check_rate_limit(user_id: str) -> bool:
    """
    检查用户速率限制（基于 Redis）
    返回 True 如果未超限，False 如果已超限
    如果 Redis 不可用，返回 True（不限制）
    """
    try:
        import redis

        # 构建 Redis URL，如果有密码则添加到 URL 中
        redis_url = settings.REDIS_URL
        if settings.REDIS_PASSWORD:
            # redis://[:password]@host:port
            redis_url = redis_url.replace(
                "redis://",
                f"redis://:{settings.REDIS_PASSWORD}@"
            )

        # 创建同步 Redis 连接用于速率限制
        r = redis.from_url(
            redis_url,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=5,
        )

        key = f"rate_limit:ai:{user_id}"
        current_time = int(time.time())
        window_start = current_time - settings.RATE_LIMIT_WINDOW

        # 移除时间窗口外的记录
        r.zremrangebyscore(key, 0, window_start)

        # 计算当前窗口内的请求数
        request_count = r.zcard(key)

        if request_count >= settings.RATE_LIMIT_REQUESTS:
            r.close()
            return False

        # 添加当前请求
        r.zadd(key, {str(current_time): current_time})
        r.expire(key, settings.RATE_LIMIT_WINDOW * 2)
        r.close()
        return True
    except Exception as e:
        # Redis 不可用时，不限制请求，记录日志
        logger.debug(f"速率限制检查失败：{e}")
        # 如果 Redis 不可用，不限制请求
        return True


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
    settings: Optional[dict] = Field(None, description="世界观设定")
    characters: Optional[str] = Field(None, description="角色信息")


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
    # 速率限制检查
    if not await check_rate_limit(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"请求过于频繁，请稍后再试（限制：{settings.RATE_LIMIT_REQUESTS} 次/分钟）"
        )

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
        logger.error(f"AI 生成失败：{e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI 生成失败，请稍后重试"
        )


@router.post("/generate/chapter", response_model=GenerateResponse, summary="生成章节")
async def generate_chapter(
    request: ChapterGenerateRequest,
    current_user: User = Depends(get_current_user),
):
    """生成章节内容"""
    # 速率限制检查
    if not await check_rate_limit(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"请求过于频繁，请稍后再试（限制：{settings.RATE_LIMIT_REQUESTS} 次/分钟）"
        )

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
        logger.error(f"AI 生成章节失败：{e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI 生成章节失败，请稍后重试"
        )


@router.post("/continue", response_model=GenerateResponse, summary="AI 续写")
async def continue_writing(
    request: ContinueRequest,
    current_user: User = Depends(get_current_user),
):
    """AI 续写（非流式）"""
    # 速率限制检查
    if not await check_rate_limit(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"请求过于频繁，请稍后再试（限制：{settings.RATE_LIMIT_REQUESTS} 次/分钟）"
        )

    ai = get_ai_client()
    try:
        content = await ai.continue_writing(
            content=request.content,
            outline=request.outline,
            length=request.length,
        )
        return {"content": content}
    except Exception as e:
        logger.error(f"AI 续写失败：{e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI 续写失败，请稍后重试"
        )


@router.post("/continue/stream", summary="AI 续写（流式）")
async def continue_writing_stream(
    request: ContinueRequest,
    current_user: User = Depends(get_current_user),
):
    """AI 续写（流式 SSE 格式）"""
    # 速率限制检查
    if not await check_rate_limit(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"请求过于频繁，请稍后再试（限制：{settings.RATE_LIMIT_REQUESTS} 次/分钟）"
        )

    ai = get_ai_client()

    async def _stream_writer() -> AsyncGenerator[str, None]:
        try:
            async for token in ai.continue_writing_stream(
                content=request.content,
                outline=request.outline,
                length=request.length,
                settings=request.settings,
                characters=request.characters,
            ):
                # 转义 JSON 特殊字符，确保换行符正确传输
                escaped_token = token.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')
                yield f"data: {json.dumps({'token': escaped_token})}\n\n"
        except Exception as e:
            logger.error(f"AI 续写流式失败：{e}")
            yield f"data: {json.dumps({'error': 'AI 续写失败'})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        _stream_writer(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Transfer-Encoding": "chunked",
        },
    )


@router.post("/rewrite", response_model=GenerateResponse, summary="AI 改写")
async def rewrite(
    request: RewriteRequest,
    current_user: User = Depends(get_current_user),
):
    """AI 改写"""
    # 速率限制检查
    if not await check_rate_limit(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"请求过于频繁，请稍后再试（限制：{settings.RATE_LIMIT_REQUESTS} 次/分钟）"
        )

    ai = get_ai_client()
    try:
        content = await ai.rewrite(
            content=request.content,
            instruction=request.instruction,
        )
        return {"content": content}
    except Exception as e:
        logger.error(f"AI 改写失败：{e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI 改写失败，请稍后重试"
        )


@router.post("/expand", response_model=GenerateResponse, summary="AI 扩写")
async def expand(
    request: ExpandRequest,
    current_user: User = Depends(get_current_user),
):
    """AI 扩写"""
    # 速率限制检查
    if not await check_rate_limit(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"请求过于频繁，请稍后再试（限制：{settings.RATE_LIMIT_REQUESTS} 次/分钟）"
        )

    ai = get_ai_client()
    try:
        content = await ai.expand(
            content=request.content,
            direction=request.direction,
        )
        return {"content": content}
    except Exception as e:
        logger.error(f"AI 扩写失败：{e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI 扩写失败，请稍后重试"
        )


async def _generate_stream_content(
    prompt: str,
    system_prompt: str,
    context: Optional[str],
    temperature: float,
) -> AsyncGenerator[str, None]:
    """流式生成内容生成器"""
    ai = get_ai_client()
    try:
        # 使用 AI 客户端的流式生成方法
        async for token in ai.generate_stream(
            prompt=prompt,
            system_prompt=system_prompt,
            context=context,
            temperature=temperature,
        ):
            # 转义 JSON 特殊字符，确保换行符正确传输
            escaped_token = token.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')
            yield f"data: {json.dumps({'token': escaped_token})}\n\n"
    except Exception as e:
        # 记录完整错误到日志，但不返回给客户端
        logger.error(f"AI 流式生成失败：{e}")
        yield f"data: {json.dumps({'error': 'AI 生成失败，请稍后重试'})}\n\n"
    yield "data: [DONE]\n\n"


@router.post("/generate/stream", summary="流式生成")
async def generate_stream(
    request: GenerateRequest,
    current_user: User = Depends(get_current_user),
):
    """流式文本生成（SSE 格式）"""
    # 速率限制检查
    if not await check_rate_limit(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"请求过于频繁，请稍后再试（限制：{settings.RATE_LIMIT_REQUESTS} 次/分钟）"
        )

    return StreamingResponse(
        _generate_stream_content(
            prompt=request.prompt,
            system_prompt=request.system_prompt or "你是一个专业的小说创作助手。",
            context=request.context,
            temperature=request.temperature or 0.7,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # 禁用 Nginx 缓冲
            "Transfer-Encoding": "chunked",
        },
    )
