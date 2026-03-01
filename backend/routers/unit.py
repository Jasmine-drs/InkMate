"""
单元管理路由
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from db.session import get_db
from schemas.unit import UnitCreate, UnitUpdate, UnitResponse
from schemas.common import PageResponse
from services.unit_service import UnitService
from routers.auth import get_current_user
from models.user import User
from models.project import Project
from models.unit import Unit

router = APIRouter(prefix="/projects/{project_id}/units", tags=["单元管理"])


@router.post("", response_model=UnitResponse, summary="创建单元")
async def create_unit(
    project_id: str,
    unit_data: UnitCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """创建新的单元"""
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

    service = UnitService(db)
    unit = await service.create_unit(project_id, unit_data)
    return unit


@router.get("", response_model=PageResponse[UnitResponse], summary="获取单元列表")
async def get_units(
    project_id: str,
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取项目的单元列表"""
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

    service = UnitService(db)
    skip = (page - 1) * page_size
    units, total = await service.get_project_units(project_id, skip, page_size)

    return PageResponse(
        items=units,
        total=total,
        page=page,
        page_size=page_size,
        has_next=skip + len(units) < total
    )


@router.get("/{unit_id}", response_model=UnitResponse, summary="获取单元详情")
async def get_unit(
    project_id: str,
    unit_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取单元详细信息"""
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

    service = UnitService(db)
    unit = await service.get_unit(project_id, unit_id)
    if not unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="单元不存在"
        )
    return unit


@router.put("/{unit_id}", response_model=UnitResponse, summary="更新单元")
async def update_unit(
    project_id: str,
    unit_id: str,
    unit_data: UnitUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """更新单元信息"""
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

    service = UnitService(db)
    unit = await service.update_unit(project_id, unit_id, unit_data)
    if not unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="单元不存在"
        )
    return unit


@router.delete("/{unit_id}", response_model=dict, summary="删除单元")
async def delete_unit(
    project_id: str,
    unit_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """删除单元"""
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

    service = UnitService(db)
    success = await service.delete_unit(project_id, unit_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="单元不存在"
        )
    return {"message": "单元已删除"}
