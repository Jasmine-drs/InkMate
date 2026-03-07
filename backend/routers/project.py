"""
项目路由
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from db.session import get_db
from schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse
from schemas.common import PageResponse
from services.project_service import ProjectService
from routers.auth import get_current_user
from models.user import User

router = APIRouter(prefix="/projects", tags=["项目管理"])


@router.post("", response_model=ProjectResponse, summary="创建项目")
async def create_project(
    project_data: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """创建新的小说项目"""
    service = ProjectService(db)
    project = await service.create_project(project_data, current_user.id)
    return project


@router.get("", response_model=PageResponse[ProjectResponse], summary="获取项目列表")
async def get_projects(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取当前用户的项目列表"""
    service = ProjectService(db)
    skip = (page - 1) * page_size
    projects, total = await service.get_user_projects(current_user.id, skip, page_size)

    return PageResponse(
        items=projects,
        total=total,
        page=page,
        page_size=page_size,
        has_next=skip + len(projects) < total
    )


@router.get("/{project_id}", response_model=ProjectResponse, summary="获取项目详情")
async def get_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取项目详细信息"""
    service = ProjectService(db)
    project = await service.get_project(project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )
    # 权限检查
    if project.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权访问该项目"
        )
    return project


@router.put("/{project_id}", response_model=ProjectResponse, summary="更新项目")
async def update_project(
    project_id: str,
    project_data: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """更新项目信息"""
    service = ProjectService(db)
    project = await service.get_project(project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )
    # 权限检查
    if project.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权修改该项目"
        )
    updated_project = await service.update_project(project_id, project_data)
    return updated_project


@router.delete("/{project_id}", response_model=dict, summary="删除项目")
async def delete_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """删除项目"""
    service = ProjectService(db)
    # 获取项目并验证权限
    project = await service.get_project(project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )
    # 验证项目所有权
    if project.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权删除该项目"
        )
    success = await service.delete_project(project_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )
    return {"message": "项目已删除"}
