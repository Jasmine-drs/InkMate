"""
大纲管理路由
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from db.session import get_db
from schemas.outline import OutlineCreate, OutlineUpdate, OutlineResponse
from schemas.common import PageResponse
from services.outline_service import OutlineService
from routers.auth import get_current_user
from models.user import User
from models.project import Project

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
