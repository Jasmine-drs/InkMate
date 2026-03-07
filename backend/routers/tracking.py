"""
状态追踪路由
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from db.session import get_db
from schemas.tracking import (
    TrackingCreate,
    TrackingUpdate,
    TrackingResponse,
    TrackingExtractRequest,
    TrackingExtractResult,
    TrackingType
)
from schemas.common import PageResponse
from services.tracking_service import TrackingService
from routers.auth import get_current_user
from models.user import User
from models.project import Project
from models.chapter import Chapter

router = APIRouter(prefix="/projects/{project_id}/tracking", tags=["状态追踪"])


@router.post("", response_model=TrackingResponse, summary="创建追踪记录")
async def create_tracking(
    project_id: str,
    tracking_data: TrackingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """创建新的状态追踪记录

    支持类型：
    - character_state: 角色状态追踪
    - foreshadowing: 伏笔管理
    - item: 物品追踪
    - timeline: 时间线管理
    - unit_progress: 单元进度追踪
    """
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

    # 如果提供了 entity_id，验证关联实体存在（可选验证）
    if tracking_data.entity_id and tracking_data.tracking_type == TrackingType.CHARACTER_STATE:
        # 验证角色是否存在
        from models.character import Character
        char_result = await db.execute(
            select(Character).where(
                Character.id == tracking_data.entity_id,
                Character.project_id == project_id
            )
        )
        if not char_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="关联的角色不存在"
            )

    service = TrackingService(db)
    tracking = await service.create_tracking(project_id, tracking_data)
    return tracking


@router.get("", response_model=PageResponse[TrackingResponse], summary="获取追踪记录列表")
async def get_trackings(
    project_id: str,
    tracking_type: TrackingType | None = Query(None, description="追踪类型过滤"),
    entity_id: str | None = Query(None, description="实体 ID 过滤"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取项目的状态追踪记录列表

    可按类型或实体 ID 过滤
    """
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

    service = TrackingService(db)
    skip = (page - 1) * page_size
    trackings, total = await service.get_project_trackings(
        project_id,
        tracking_type=tracking_type,
        entity_id=entity_id,
        skip=skip,
        limit=page_size
    )

    return PageResponse(
        items=trackings,
        total=total,
        page=page,
        page_size=page_size,
        has_next=skip + len(trackings) < total
    )


@router.get("/{tracking_id}", response_model=TrackingResponse, summary="获取追踪记录详情")
async def get_tracking(
    project_id: str,
    tracking_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取单条追踪记录的详细信息"""
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

    service = TrackingService(db)
    tracking = await service.get_tracking(project_id, tracking_id)
    if not tracking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="追踪记录不存在"
        )
    return tracking


@router.put("/{tracking_id}", response_model=TrackingResponse, summary="更新追踪记录")
async def update_tracking(
    project_id: str,
    tracking_id: str,
    tracking_data: TrackingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """更新追踪记录信息"""
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

    service = TrackingService(db)
    tracking = await service.update_tracking(project_id, tracking_id, tracking_data)
    if not tracking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="追踪记录不存在"
        )
    return tracking


@router.delete("/{tracking_id}", response_model=dict, summary="删除追踪记录")
async def delete_tracking(
    project_id: str,
    tracking_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """删除追踪记录"""
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

    service = TrackingService(db)
    success = await service.delete_tracking(project_id, tracking_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="追踪记录不存在"
        )
    return {"message": "追踪记录已删除"}


@router.get("/entity/{entity_id}", response_model=list[TrackingResponse], summary="获取实体追踪历史")
async def get_entity_trackings(
    project_id: str,
    entity_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取特定实体的所有追踪记录（按时间顺序）

    可用于查看角色状态变化历史、物品流转记录等
    """
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

    service = TrackingService(db)
    trackings = await service.get_trackings_by_entity(project_id, entity_id)
    return trackings


@router.post("/extract", response_model=list[TrackingExtractResult], summary="从章节提取状态更新")
async def extract_tracking_from_chapters(
    project_id: str,
    request: TrackingExtractRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """从章节内容中自动提取状态更新建议

    分析指定章节的内容，识别：
    - 角色状态变化（情绪、位置、关系等）
    - 伏笔设置与回收
    - 物品获取/丢失
    - 时间线推进

    返回提取结果供用户确认后创建正式追踪记录
    """
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

    # 获取章节内容
    chapters_result = await db.execute(
        select(Chapter).where(
            Chapter.id.in_(request.chapter_ids),
            Chapter.project_id == project_id
        )
    )
    chapters = chapters_result.scalars().all()

    if not chapters:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到指定章节"
        )

    # 使用 AI 从章节提取追踪记录
    service = TrackingService(db)
    results = []

    for chapter in chapters:
        # 调用 AI 提取
        extracted = await service.extract_from_chapter_ai(
            project_id=project_id,
            chapter_id=chapter.id,
            chapter_content=chapter.content or "",
            chapter_number=chapter.chapter_number,
            tracking_types=request.tracking_types,
        )

        # 保存提取的追踪记录
        saved_trackings = await service.save_extracted_trackings(extracted)

        # 构建返回结果
        result = TrackingExtractResult(
            chapter_id=chapter.id,
            chapter_title=chapter.title or "",
            extracted_trackings=[
                TrackingCreate(
                    tracking_type=t.tracking_type,
                    entity_id=t.entity_id,
                    chapter_number=t.chapter_number,
                    state_data=t.state_data,
                )
                for t in saved_trackings
            ]
        )
        results.append(result)

    return results
