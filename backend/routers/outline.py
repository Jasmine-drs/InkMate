"""
大纲管理路由
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from db.session import get_db
from schemas.outline import OutlineCreate, OutlineUpdate, OutlineResponse
from schemas.common import PageResponse
from services.outline_service import OutlineService
from routers.auth import get_current_user
from models.user import User
from models.project import Project
from pydantic import BaseModel, Field
from typing import Optional, AsyncGenerator
import json
from loguru import logger

router = APIRouter(prefix="/projects/{project_id}/outlines", tags=["大纲管理"])


@router.post("", response_model=OutlineResponse, summary="创建大纲")
async def create_outline(
    project_id: str,
    outline_data: OutlineCreate,
    unit_id: str | None = Query(None, description="单元 ID（单元大纲时填写）"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """创建新的大纲"""
    # 验证项目权限
    project_result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = project_result.scalar_one_or_none()
    if not project or project.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权访问该项目"
        )

    service = OutlineService(db)
    outline = await service.create_outline(project_id, outline_data, unit_id)
    return outline


@router.get("", response_model=PageResponse[OutlineResponse], summary="获取大纲列表")
async def get_outlines(
    project_id: str,
    outline_type: str | None = Query(None, description="大纲类型：main, unit, chapter"),
    unit_id: str | None = Query(None, description="单元 ID"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取项目的大纲列表"""
    # 验证项目权限
    project_result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = project_result.scalar_one_or_none()
    if not project or project.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权访问该项目"
        )

    service = OutlineService(db)
    skip = (page - 1) * page_size
    outlines, total = await service.get_project_outlines(
        project_id, outline_type, unit_id, skip, page_size
    )

    return PageResponse(
        items=outlines,
        total=total,
        page=page,
        page_size=page_size,
        has_next=skip + len(outlines) < total
    )


@router.get("/{outline_id}", response_model=OutlineResponse, summary="获取大纲详情")
async def get_outline(
    project_id: str,
    outline_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取大纲详细信息"""
    # 验证项目权限
    project_result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = project_result.scalar_one_or_none()
    if not project or project.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权访问该项目"
        )

    service = OutlineService(db)
    outline = await service.get_outline(project_id, outline_id)
    if not outline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="大纲不存在"
        )
    return outline


@router.put("/{outline_id}", response_model=OutlineResponse, summary="更新大纲")
async def update_outline(
    project_id: str,
    outline_id: str,
    outline_data: OutlineUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """更新大纲信息"""
    # 验证项目权限
    project_result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = project_result.scalar_one_or_none()
    if not project or project.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权访问该项目"
        )

    service = OutlineService(db)
    outline = await service.update_outline(project_id, outline_id, outline_data)
    if not outline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="大纲不存在"
        )
    return outline


@router.delete("/{outline_id}", response_model=dict, summary="删除大纲")
async def delete_outline(
    project_id: str,
    outline_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """删除大纲"""
    # 验证项目权限
    project_result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = project_result.scalar_one_or_none()
    if not project or project.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权访问该项目"
        )

    service = OutlineService(db)
    success = await service.delete_outline(project_id, outline_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="大纲不存在"
        )
    return {"message": "大纲已删除"}


# ============= AI 生成大纲相关接口 =============

class OutlineGenerateRequest(BaseModel):
    """大纲生成请求"""
    theme: str = Field(..., description="小说主题")
    description: str = Field(..., description="小说简介")
    world_view: Optional[str] = Field(None, description="世界观设定")
    outline_type: str = Field(default="main", description="大纲类型：main=主线大纲，unit=单元大纲")
    unit_id: Optional[str] = Field(None, description="单元 ID（单元大纲时必填）")


class OutlineBreakdownRequest(BaseModel):
    """章节细纲拆解请求"""
    outline_id: str = Field(..., description="大纲 ID")
    chapter_count: int = Field(default=10, ge=1, le=50, description="期望的章节数量")


@router.post("/generate", response_model=OutlineResponse, summary="AI 生成大纲")
async def generate_outline(
    project_id: str,
    request: OutlineGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """AI 生成大纲（非流式）"""
    # 验证项目权限
    project_result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = project_result.scalar_one_or_none()
    if not project or project.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权访问该项目"
        )

    # 验证单元大纲时必须有 unit_id
    if request.outline_type == "unit" and not request.unit_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="生成单元大纲时必须提供单元 ID"
        )

    service = OutlineService(db)
    try:
        outline = await service.generate_outline(
            project_id=project_id,
            theme=request.theme,
            description=request.description,
            world_view=request.world_view,
            outline_type=request.outline_type,
            unit_id=request.unit_id,
        )
        return outline
    except Exception as e:
        logger.error(f"AI 生成大纲失败：{e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI 生成大纲失败：{str(e)}"
        )


@router.post("/generate/stream", summary="AI 生成大纲（流式）")
async def generate_outline_stream(
    project_id: str,
    request: OutlineGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """AI 生成大纲（流式 SSE 格式）"""
    # 验证项目权限
    project_result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = project_result.scalar_one_or_none()
    if not project or project.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权访问该项目"
        )

    # 验证单元大纲时必须有 unit_id
    if request.outline_type == "unit" and not request.unit_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="生成单元大纲时必须提供单元 ID"
        )

    service = OutlineService(db)

    async def _stream_writer() -> AsyncGenerator[str, None]:
        try:
            async for token in service.generate_outline_stream(
                project_id=project_id,
                theme=request.theme,
                description=request.description,
                world_view=request.world_view,
                outline_type=request.outline_type,
                unit_id=request.unit_id,
            ):
                # 转义 JSON 特殊字符
                escaped_token = token.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')
                yield f"data: {json.dumps({'token': escaped_token})}\n\n"
        except Exception as e:
            logger.error(f"AI 生成大纲流式失败：{e}")
            yield f"data: {json.dumps({'error': 'AI 生成大纲失败'})}\n\n"
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


@router.post("/breakdown", summary="拆解章节细纲")
async def breakdown_to_chapters(
    project_id: str,
    request: OutlineBreakdownRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """根据大纲拆解章节细纲"""
    # 验证项目权限
    project_result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = project_result.scalar_one_or_none()
    if not project or project.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权访问该项目"
        )

    service = OutlineService(db)
    try:
        chapters = await service.breakdown_to_chapters(
            project_id=project_id,
            outline_id=request.outline_id,
            chapter_count=request.chapter_count,
        )
        return {"chapters": chapters, "count": len(chapters)}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"拆解章节细纲失败：{e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"拆解章节细纲失败：{str(e)}"
        )


@router.post("/breakdown/stream", summary="拆解章节细纲（流式）")
async def breakdown_to_chapters_stream(
    project_id: str,
    request: OutlineBreakdownRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """根据大纲拆解章节细纲（流式 SSE 格式）"""
    # 验证项目权限
    project_result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = project_result.scalar_one_or_none()
    if not project or project.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权访问该项目"
        )

    service = OutlineService(db)

    async def _stream_writer() -> AsyncGenerator[str, None]:
        try:
            async for token in service.breakdown_to_chapters_stream(
                project_id=project_id,
                outline_id=request.outline_id,
                chapter_count=request.chapter_count,
            ):
                # 转义 JSON 特殊字符
                escaped_token = token.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')
                yield f"data: {json.dumps({'token': escaped_token})}\n\n"
        except Exception as e:
            logger.error(f"拆解章节细纲流式失败：{e}")
            yield f"data: {json.dumps({'error': '拆解章节细纲失败'})}\n\n"
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
