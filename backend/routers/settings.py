"""
设定管理路由
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from db.session import get_db
from routers.auth import get_current_user
from models.user import User
from models.project import Project
from services.setting_service import SettingService
from services.project_service import ProjectService
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, AsyncGenerator
import json
from loguru import logger


router = APIRouter(prefix="/projects", tags=["设定管理"])


class SettingGenerateRequest(BaseModel):
    """设定生成请求"""
    setting_type: str = Field(..., description="设定类型：world_view, time_setting, location_setting, power_system, magic, etc.")
    prompt: str = Field(..., description="生成提示")
    temperature: Optional[float] = Field(0.7, ge=0, le=2, description="生成温度")


class SettingGenerateStreamRequest(BaseModel):
    """设定流式生成请求"""
    setting_type: str = Field(..., description="设定类型")
    prompt: str = Field(..., description="生成提示")
    temperature: Optional[float] = Field(0.7, ge=0, le=2, description="生成温度")


class SettingConsistencyCheckRequest(BaseModel):
    """设定一致性检查请求"""
    content_to_check: Optional[str] = Field(None, description="待检查的内容（如章节内容）")


class FullWorldviewGenerateRequest(BaseModel):
    """完整世界观生成请求"""
    genre: str = Field(..., description="小说类型")
    description: str = Field(..., description="小说简介")
    temperature: Optional[float] = Field(0.7, ge=0, le=2, description="生成温度")


class GenerateResponse(BaseModel):
    """生成响应"""
    content: str


class ConsistencyCheckResponse(BaseModel):
    """一致性检查响应"""
    consistent: bool
    issues: list[str]
    suggestions: list[str]


async def _generate_setting_stream(
    setting_type: str,
    prompt: str,
    project_settings: Optional[Dict[str, Any]],
    temperature: float,
) -> AsyncGenerator[str, None]:
    """流式生成设定内容"""
    service = SettingService(None)  # db 不是必需的

    try:
        async for token in service.generate_setting_stream(
            setting_type=setting_type,
            prompt=prompt,
            project_settings=project_settings,
            temperature=temperature,
        ):
            # 转义 JSON 特殊字符
            escaped_token = token.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')
            yield f"data: {json.dumps({'token': escaped_token})}\n\n"
    except Exception as e:
        logger.error(f"AI 流式生成设定失败：{e}")
        yield f"data: {json.dumps({'error': 'AI 生成失败，请稍后重试'})}\n\n"
    yield "data: [DONE]\n\n"


@router.post("/{project_id}/settings/generate", response_model=GenerateResponse, summary="AI 生成设定")
async def generate_setting(
    project_id: str,
    request: SettingGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """AI 生成单项设定"""
    service = ProjectService(db)
    project = await service.get_project(project_id)

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

    setting_service = SettingService(db)

    try:
        content = await setting_service.generate_setting(
            setting_type=request.setting_type,
            prompt=request.prompt,
            project_settings=project.settings,
            temperature=request.temperature,
        )
        return {"content": content}
    except Exception as e:
        logger.error(f"AI 生成设定失败：{e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI 生成失败：{str(e)}"
        )


@router.post("/{project_id}/settings/generate/stream", summary="AI 生成设定（流式）")
async def generate_setting_stream(
    project_id: str,
    request: SettingGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """AI 流式生成单项设定（SSE 格式）"""
    service = ProjectService(db)
    project = await service.get_project(project_id)

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

    return StreamingResponse(
        _generate_setting_stream(
            setting_type=request.setting_type,
            prompt=request.prompt,
            project_settings=project.settings,
            temperature=request.temperature,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Transfer-Encoding": "chunked",
        },
    )


@router.post("/{project_id}/settings/generate-full", response_model=Dict[str, str], summary="AI 生成完整世界观")
async def generate_full_worldview(
    project_id: str,
    request: FullWorldviewGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """AI 生成完整的世界观设定"""
    service = ProjectService(db)
    project = await service.get_project(project_id)

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

    setting_service = SettingService(db)

    try:
        result = await setting_service.generate_full_worldview(
            novel_genre=request.genre,
            brief_description=request.description,
            temperature=request.temperature,
        )
        return result
    except Exception as e:
        logger.error(f"AI 生成完整世界观失败：{e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI 生成失败：{str(e)}"
        )


@router.post("/{project_id}/settings/check-consistency", response_model=ConsistencyCheckResponse, summary="设定一致性检查")
async def check_setting_consistency(
    project_id: str,
    request: SettingConsistencyCheckRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """检查设定一致性"""
    service = ProjectService(db)
    project = await service.get_project(project_id)

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

    if not project.settings:
        return {
            "consistent": True,
            "issues": ["暂无设定内容"],
            "suggestions": ["请先完善世界观设定"]
        }

    setting_service = SettingService(db)

    try:
        result = await setting_service.check_setting_consistency(
            project_settings=project.settings,
            content_to_check=request.content_to_check,
        )
        return result
    except Exception as e:
        logger.error(f"设定一致性检查失败：{e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"一致性检查失败：{str(e)}"
        )
