"""
导出管理路由
支持 TXT、EPUB、DOCX 格式导出
"""
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.session import get_db
from models.project import Project
from models.user import User
from routers.auth import get_current_user
from services.batch_export_service import BatchExportService
from services.export_service import ExportService
from utils.deps import get_project_with_auth

router = APIRouter(prefix="/export", tags=["导出管理"])


class BatchExportRequest(BaseModel):
    """批量导出请求"""

    project_ids: List[str] = Field(..., description="项目 ID 列表")
    format: str = Field("txt", description="导出格式：txt, epub, docx")


class ChapterBatchExportRequest(BaseModel):
    """章节批量导出请求"""

    chapter_ids: List[str] = Field(..., description="章节 ID 列表")
    format: str = Field("txt", description="导出格式：txt, epub, docx")


class ExportHistoryResponse(BaseModel):
    """导出历史响应"""

    id: str
    project_id: str
    format: str
    file_name: str
    file_size: int
    chapter_count: int
    is_batch: bool
    created_at: datetime

    class Config:
        from_attributes = True


async def _ensure_projects_owned(
    project_ids: list[str],
    db: AsyncSession,
    current_user: User,
) -> list[Project]:
    """验证批量导出的项目都存在且属于当前用户。"""
    result = await db.execute(select(Project).where(Project.id.in_(project_ids)))
    projects = list(result.scalars().all())

    found_ids = {project.id for project in projects}
    missing_ids = [project_id for project_id in project_ids if project_id not in found_ids]
    if missing_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="部分项目不存在",
        )

    for project in projects:
        if project.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"无权访问项目：{project.title}",
            )

    return projects


@router.get("/{project_id}/txt", summary="导出 TXT 格式")
async def export_txt(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """导出项目为 TXT 格式"""
    await get_project_with_auth(project_id, db, current_user)
    service = ExportService(db)

    try:
        async def generate_file():
            async for chunk in service.export_to_txt(project_id):
                yield chunk

        project = await service.get_project_info(project_id)
        filename = f"{project.title}.txt" if project else "novel.txt"

        return StreamingResponse(
            generate_file(),
            media_type="text/plain; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"导出失败：{str(error)}",
        ) from error


@router.get("/{project_id}/epub", summary="导出 EPUB 格式")
async def export_epub(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """导出项目为 EPUB 格式"""
    await get_project_with_auth(project_id, db, current_user)
    service = ExportService(db)

    try:
        async def generate_file():
            async for chunk in service.export_to_epub(project_id):
                yield chunk

        project = await service.get_project_info(project_id)
        filename = f"{project.title}.epub" if project else "novel.epub"

        return StreamingResponse(
            generate_file(),
            media_type="application/epub+zip",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"导出失败：{str(error)}",
        ) from error


@router.get("/{project_id}/docx", summary="导出 DOCX 格式")
async def export_docx(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """导出项目为 DOCX 格式"""
    await get_project_with_auth(project_id, db, current_user)
    service = ExportService(db)

    try:
        async def generate_file():
            async for chunk in service.export_to_docx(project_id):
                yield chunk

        project = await service.get_project_info(project_id)
        filename = f"{project.title}.docx" if project else "novel.docx"

        return StreamingResponse(
            generate_file(),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"导出失败：{str(error)}",
        ) from error


@router.post("/batch", summary="批量导出项目")
async def batch_export_projects(
    request: BatchExportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """批量导出多个项目为 ZIP 文件"""
    await _ensure_projects_owned(request.project_ids, db, current_user)
    service = BatchExportService(db)

    async def generate():
        async for chunk in service.export_projects_to_zip(request.project_ids, request.format):
            yield chunk

    file_name = f"批量导出_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{request.format}.zip"

    return StreamingResponse(
        generate(),
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{file_name}"},
    )


@router.post("/chapters/batch", summary="批量导出章节")
async def batch_export_chapters(
    request: ChapterBatchExportRequest,
    project_id: str = Query(..., description="项目 ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """批量导出指定章节为 ZIP 文件"""
    await get_project_with_auth(project_id, db, current_user)
    service = BatchExportService(db)

    async def generate():
        async for chunk in service.export_chapters_to_zip(project_id, request.chapter_ids, request.format):
            yield chunk

    file_name = f"章节导出_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"

    return StreamingResponse(
        generate(),
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{file_name}"},
    )


@router.get("/history", response_model=list[ExportHistoryResponse], summary="获取导出历史")
async def get_export_history(
    project_id: Optional[str] = Query(None, description="项目 ID"),
    limit: int = Query(20, ge=1, le=100, description="获取数量"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取用户的导出历史记录"""
    service = ExportService(db)
    history_list = await service.get_export_history(current_user.id, project_id, limit)
    return [ExportHistoryResponse.model_validate(history) for history in history_list]


@router.delete("/history/{history_id}", summary="删除导出历史")
async def delete_export_history(
    history_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """删除导出历史记录"""
    service = ExportService(db)
    success = await service.delete_export_history(current_user.id, history_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="导出记录不存在",
        )
    return {"message": "导出记录已删除"}
