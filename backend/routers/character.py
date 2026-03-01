"""
角色管理路由
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from db.session import get_db
from schemas.character import CharacterCreate, CharacterUpdate, CharacterResponse
from schemas.common import PageResponse
from services.character_service import CharacterService
from routers.auth import get_current_user
from models.user import User
from models.project import Project

router = APIRouter(prefix="/projects/{project_id}/characters", tags=["角色管理"])


@router.post("", response_model=CharacterResponse, summary="创建角色")
async def create_character(
    project_id: str,
    character_data: CharacterCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """创建新的角色"""
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

    service = CharacterService(db)
    character = await service.create_character(project_id, character_data)
    return character


@router.get("", response_model=PageResponse[CharacterResponse], summary="获取角色列表")
async def get_characters(
    project_id: str,
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取项目的角色列表"""
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

    service = CharacterService(db)
    skip = (page - 1) * page_size
    characters, total = await service.get_project_characters(project_id, skip, page_size)

    return PageResponse(
        items=characters,
        total=total,
        page=page,
        page_size=page_size,
        has_next=skip + len(characters) < total
    )


@router.get("/{character_id}", response_model=CharacterResponse, summary="获取角色详情")
async def get_character(
    project_id: str,
    character_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取角色详细信息"""
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

    service = CharacterService(db)
    character = await service.get_character(project_id, character_id)
    if not character:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="角色不存在"
        )
    return character


@router.put("/{character_id}", response_model=CharacterResponse, summary="更新角色")
async def update_character(
    project_id: str,
    character_id: str,
    character_data: CharacterUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """更新角色信息"""
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

    service = CharacterService(db)
    character = await service.update_character(project_id, character_id, character_data)
    if not character:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="角色不存在"
        )
    return character


@router.delete("/{character_id}", response_model=dict, summary="删除角色")
async def delete_character(
    project_id: str,
    character_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """删除角色"""
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

    service = CharacterService(db)
    success = await service.delete_character(project_id, character_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="角色不存在"
        )
    return {"message": "角色已删除"}
