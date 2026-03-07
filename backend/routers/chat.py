"""
AI 对话路由
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update
from db.session import get_db
from routers.auth import get_current_user
from models.user import User
from models.project import Project
from models.chat_message import ChatMessage
from schemas.chat import ChatRequest, ChatMessageCreate, ChatMessageResponse, ChatHistoryResponse
from services.chat_service import ChatService
from utils.ai_client import get_ai_client
from config import settings
from typing import Optional, AsyncGenerator
import json
from loguru import logger

router = APIRouter(prefix="/chat", tags=["AI 对话"])


def _build_system_prompt(context_type: str, project: Optional[Project] = None) -> str:
    """
    根据上下文类型构建系统提示

    Args:
        context_type: 上下文类型
        project: 项目信息（可选）

    Returns:
        系统提示文本
    """
    base_prompts = {
        "general": """你是一个专业的小说创作助手，擅长回答各种创作相关问题。
请提供清晰、实用、有启发性的回答。""",

        "creation": """你是一个专业的小说创作顾问，擅长：
1. 情节设计和结构分析
2. 角色塑造和人物关系
3. 场景描写和氛围营造
4. 对话写作和节奏把控

请结合创作理论，提供具体、可操作的建议。""",

        "setting": """你是一个专业的世界观架构师，擅长：
1. 世界观设定和背景构建
2. 力量体系和规则设计
3. 魔法/科技体系设计
4. 社会结构和文化设定

请帮助完善设定细节，确保逻辑自洽。""",

        "inspiration": """你是一个创意激发专家，擅长：
1. 头脑风暴和创意发散
2. 情节转折和高潮设计
3. 角色冲突和成长弧线
4. 新颖设定和独特视角

请提供多个创意方向，激发创作灵感。""",

        "diagnosis": """你是一个专业的小说编辑，擅长：
1. 识别情节漏洞和逻辑问题
2. 分析节奏问题和冗余内容
3. 发现角色塑造的不足
4. 指出设定矛盾和不一致

请直言不讳地指出问题，并提供改进建议。""",
    }

    system_prompt = base_prompts.get(context_type, base_prompts["general"])

    # 如果有项目信息，添加到系统提示
    if project:
        project_info = f"\n\n当前项目：{project.title}"
        if project.description:
            project_info += f"\n项目简介：{project.description}"
        if project.genre:
            project_info += f"\n题材类型：{project.genre}"
        system_prompt += project_info

    return system_prompt


async def _get_project_for_chat(
    project_id: str,
    db: AsyncSession,
    current_user: User,
) -> Project:
    """校验项目存在且属于当前用户。"""
    from services.project_service import ProjectService

    project_service = ProjectService(db)
    project = await project_service.get_project(project_id)

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在",
        )

    if project.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权访问该项目",
        )

    return project


async def _validate_chat_chapter(
    project_id: str,
    chapter_id: Optional[str],
    db: AsyncSession,
) -> None:
    """校验章节存在且属于当前项目。"""
    if not chapter_id:
        return

    from services.chapter_service import ChapterService

    chapter_service = ChapterService(db)
    chapter = await chapter_service.get_chapter_by_id(chapter_id)
    if not chapter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="章节不存在",
        )
    if chapter.project_id != project_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="章节不属于该项目",
        )


async def _generate_chat_stream(
    prompt: str,
    system_prompt: str,
    context: Optional[str] = None,
) -> AsyncGenerator[str, None]:
    """
    流式生成对话内容

    Args:
        prompt: 用户提示
        system_prompt: 系统提示
        context: 上下文信息

    Yields:
        SSE 格式的数据块
    """
    ai = get_ai_client()

    if not settings.OPENAI_API_KEY:
        logger.warning("未配置 OPENAI_API_KEY")
        yield f"data: {json.dumps({'error': 'AI 服务未配置'})}\n\n"
        yield "data: [DONE]\n\n"
        return

    try:
        async for token in ai.generate_stream(
            prompt=prompt,
            system_prompt=system_prompt,
            context=context,
            temperature=0.7,
        ):
            # 转义 JSON 特殊字符
            escaped_token = token.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')
            yield f"data: {json.dumps({'token': escaped_token})}\n\n"
    except Exception as e:
        logger.error(f"AI 对话生成失败：{e}")
        yield f"data: {json.dumps({'error': 'AI 生成失败，请稍后重试'})}\n\n"

    yield "data: [DONE]\n\n"


@router.post("", summary="AI 对话（流式）")
async def chat(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    AI 对话接口（流式响应）

    支持多种对话类型：
    - general: 通用咨询
    - creation: 创作咨询
    - setting: 设定查询
    - inspiration: 灵感激发
    - diagnosis: 问题诊断
    """
    project = await _get_project_for_chat(request.project_id, db, current_user)
    await _validate_chat_chapter(request.project_id, request.chapter_id, db)

    # 保存用户消息
    user_message = ChatMessageCreate(
        project_id=request.project_id,
        chapter_id=request.chapter_id,
        role="user",
        content=request.prompt,
    )
    chat_service = ChatService(db)
    await chat_service.create_message(user_message)

    # 构建系统提示
    system_prompt = request.system_prompt or _build_system_prompt(request.context_type, project)

    # 构建上下文（最近 5 条对话历史 + 项目设定联动）
    recent_messages, _ = await chat_service.get_messages(
        project_id=request.project_id,
        chapter_id=request.chapter_id,
        limit=5,
    )

    context_parts = []

    # 添加项目设定联动（世界观、角色等）
    project_context = await chat_service.build_chat_context(
        project_id=request.project_id,
        chapter_id=request.chapter_id,
    )
    if project_context:
        context_parts.append(project_context)

    if recent_messages:
        history_context = "\n".join([
            f"{'用户' if msg.role == 'user' else '助手'}: {msg.content}"
            for msg in recent_messages
        ])
        context_parts.append(f"对话历史:\n{history_context}")

    context = "\n\n".join(context_parts) if context_parts else None

    # 创建助手消息占位符
    assistant_message = ChatMessageCreate(
        project_id=request.project_id,
        chapter_id=request.chapter_id,
        role="assistant",
        content="",  # 初始为空，后续更新
    )
    assistant_msg = await chat_service.create_message(assistant_message)

    # 返回流式响应
    async def chat_stream() -> AsyncGenerator[str, None]:
        full_content = ""
        try:
            async for chunk in _generate_chat_stream(
                prompt=request.prompt,
                system_prompt=system_prompt,
                context=context,
            ):
                if chunk.startswith("data: "):
                    data_str = chunk[6:-2]  # 移除 "data: " 和 "\n\n"
                    if data_str == "[DONE]":
                        # 流式结束，更新完整的消息内容
                        if full_content:
                            await db.execute(
                                update(ChatMessage)
                                .where(ChatMessage.id == assistant_msg.id)
                                .values(content=full_content)
                            )
                            await db.commit()
                        yield chunk
                        break
                    else:
                        data = json.loads(data_str)
                        if "token" in data:
                            # 反转义 token
                            token = data["token"].replace('\\n', '\n').replace('\\"', '"').replace('\\\\', '\\')
                            full_content += token
                        yield chunk
                else:
                    yield chunk
        except Exception as e:
            logger.error(f"对话流式处理失败：{e}")
            # 更新消息为错误状态
            try:
                await db.execute(
                    update(ChatMessage)
                    .where(ChatMessage.id == assistant_msg.id)
                    .values(content=f"[错误] AI 回复失败：{str(e)}")
                )
                await db.commit()
            except Exception as update_error:
                logger.error(f"更新错误消息失败：{update_error}")
                pass
            yield f"data: {json.dumps({'error': '对话生成失败'})}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        chat_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Transfer-Encoding": "chunked",
        },
    )


@router.post("/send", response_model=ChatMessageResponse, summary="发送消息（非流式）")
async def send_message(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    AI 对话接口（非流式，返回完整响应）

    适用于需要完整响应后处理的场景
    """
    project = await _get_project_for_chat(request.project_id, db, current_user)
    await _validate_chat_chapter(request.project_id, request.chapter_id, db)

    # 保存用户消息
    user_message = ChatMessageCreate(
        project_id=request.project_id,
        chapter_id=request.chapter_id,
        role="user",
        content=request.prompt,
    )
    chat_service = ChatService(db)
    await chat_service.create_message(user_message)

    # 构建系统提示
    system_prompt = request.system_prompt or _build_system_prompt(request.context_type, project)

    # 调用 AI 生成回复
    ai = get_ai_client()
    try:
        response_content = await ai.generate(
            prompt=request.prompt,
            system_prompt=system_prompt,
            temperature=0.7,
        )
    except Exception as e:
        logger.error(f"AI 生成失败：{e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI 生成失败，请稍后重试"
        )

    # 保存助手回复
    assistant_message = ChatMessageCreate(
        project_id=request.project_id,
        chapter_id=request.chapter_id,
        role="assistant",
        content=response_content,
    )
    assistant_msg = await chat_service.create_message(assistant_message)

    return assistant_msg


@router.get("/history", response_model=ChatHistoryResponse, summary="获取对话历史")
async def get_chat_history(
    project_id: str = Query(..., description="项目 ID"),
    chapter_id: Optional[str] = Query(None, description="章节 ID（可选）"),
    limit: int = Query(50, ge=1, le=200, description="获取消息数量"),
    offset: int = Query(0, ge=0, description="偏移量"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    获取对话历史记录

    可按项目 ID 和章节 ID 过滤
    """
    # 验证项目权限
    from services.project_service import ProjectService
    project_service = ProjectService(db)
    project = await project_service.get_project(project_id)

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )

    if project.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权访问该项目"
        )

    # 获取对话历史
    chat_service = ChatService(db)
    messages, total = await chat_service.get_messages(
        project_id=project_id,
        chapter_id=chapter_id,
        limit=limit,
        offset=offset,
    )

    return ChatHistoryResponse(
        messages=messages,
        total=total,
    )


@router.delete("/history", summary="清除对话历史")
async def clear_chat_history(
    project_id: str = Query(..., description="项目 ID"),
    chapter_id: Optional[str] = Query(None, description="章节 ID（可选）"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    清除对话历史记录

    可选择清除特定章节的对话或整个项目的对话
    """
    # 验证项目权限
    from services.project_service import ProjectService
    project_service = ProjectService(db)
    project = await project_service.get_project(project_id)

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )

    if project.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权访问该项目"
        )

    # 删除对话记录
    chat_service = ChatService(db)
    deleted_count = await chat_service.delete_messages(
        project_id=project_id,
        chapter_id=chapter_id,
    )

    return {
        "message": f"已清除 {deleted_count} 条对话记录",
        "deleted_count": deleted_count,
    }
