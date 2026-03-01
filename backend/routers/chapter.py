"""
章节管理路由
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from db.session import get_db
from schemas.chapter import ChapterCreate, ChapterUpdate, ChapterResponse, ChapterVersionResponse
from schemas.common import PageResponse
from services.chapter_service import ChapterService
from routers.auth import get_current_user
from models.user import User
from models.project import Project
from models.chapter import Chapter

router = APIRouter(prefix="/projects/{project_id}/chapters", tags=["章节管理"])


@router.post("", response_model=ChapterResponse, summary="创建章节")
async def create_chapter(
    project_id: str,
    chapter_data: ChapterCreate,
    unit_id: str | None = Query(None, description="单元 ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """创建新的章节"""
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

    service = ChapterService(db)
    chapter = await service.create_chapter(project_id, chapter_data, unit_id)
    return chapter


@router.get("", response_model=PageResponse[ChapterResponse], summary="获取章节列表")
async def get_chapters(
    project_id: str,
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取项目的章节列表"""
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

    service = ChapterService(db)
    skip = (page - 1) * page_size
    chapters, total = await service.get_project_chapters(project_id, skip, page_size)

    return PageResponse(
        items=chapters,
        total=total,
        page=page,
        page_size=page_size,
        has_next=skip + len(chapters) < total
    )


@router.get("/{chapter_num}", response_model=ChapterResponse, summary="获取章节内容")
async def get_chapter(
    project_id: str,
    chapter_num: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取指定章节的内容"""
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

    service = ChapterService(db)
    chapter = await service.get_chapter(project_id, chapter_num)
    if not chapter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="章节不存在"
        )
    return chapter


@router.put("/{chapter_id}", response_model=ChapterResponse, summary="更新章节内容")
async def update_chapter(
    project_id: str,
    chapter_id: str,
    chapter_data: ChapterUpdate,
    create_version: bool = Query(True, description="是否创建新版本"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """更新章节内容"""
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

    service = ChapterService(db)
    chapter = await service.get_chapter_by_id(chapter_id)
    if not chapter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="章节不存在"
        )

    # 验证章节属于该项目
    if chapter.project_id != project_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="章节不属于该项目"
        )

    chapter = await service.update_chapter(chapter_id, chapter_data, create_version)
    return chapter


@router.delete("/{chapter_id}", response_model=dict, summary="删除章节")
async def delete_chapter(
    project_id: str,
    chapter_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """删除章节"""
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

    service = ChapterService(db)
    chapter = await service.get_chapter_by_id(chapter_id)
    if not chapter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="章节不存在"
        )

    # 验证章节属于该项目
    if chapter.project_id != project_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="章节不属于该项目"
        )

    success = await service.delete_chapter(chapter_id)
    return {"message": "章节已删除"}


@router.get(
    "/{chapter_id}/versions",
    response_model=PageResponse[ChapterVersionResponse],
    summary="获取版本历史",
)
async def get_chapter_versions(
    project_id: str,
    chapter_id: str,
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取章节的版本历史"""
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

    service = ChapterService(db)
    chapter = await service.get_chapter_by_id(chapter_id)
    if not chapter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="章节不存在"
        )

    # 验证章节属于该项目
    if chapter.project_id != project_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="章节不属于该项目"
        )

    skip = (page - 1) * page_size
    versions, total = await service.get_chapter_versions(chapter_id, skip, page_size)

    return PageResponse(
        items=versions,
        total=total,
        page=page,
        page_size=page_size,
        has_next=skip + len(versions) < total
    )


@router.get(
    "/{chapter_id}/versions/{version_num}",
    response_model=ChapterVersionResponse,
    summary="获取指定版本",
)
async def get_chapter_version(
    project_id: str,
    chapter_id: str,
    version_num: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取章节的指定版本内容"""
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

    service = ChapterService(db)
    chapter = await service.get_chapter_by_id(chapter_id)
    if not chapter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="章节不存在"
        )

    # 验证章节属于该项目
    if chapter.project_id != project_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="章节不属于该项目"
        )

    version = await service.get_chapter_version(chapter_id, version_num)
    if not version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="版本不存在"
        )
    return version
