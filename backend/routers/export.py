"""
导出管理路由
支持 TXT、EPUB、DOCX 格式导出
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from db.session import get_db
from services.export_service import ExportService
from routers.auth import get_current_user
from models.user import User
from utils.deps import get_project_with_auth

router = APIRouter(prefix="/api/export", tags=["导出管理"])


@router.get("/{project_id}/txt", summary="导出 TXT 格式")
async def export_txt(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """导出项目为 TXT 格式"""
    # 验证项目权限
    await get_project_with_auth(project_id, db, current_user)

    try:
        service = ExportService(db)

        async def generate_file():
            async for chunk in service.export_to_txt(project_id):
                yield chunk

        project = await service.get_project_info(project_id)
        filename = f"{project.title}.txt" if project else "novel.txt"

        return StreamingResponse(
            generate_file(),
            media_type="text/plain; charset=utf-8",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"导出失败：{str(e)}"
        )


@router.get("/{project_id}/epub", summary="导出 EPUB 格式")
async def export_epub(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """导出项目为 EPUB 格式"""
    # 验证项目权限
    await get_project_with_auth(project_id, db, current_user)

    try:
        service = ExportService(db)

        async def generate_file():
            async for chunk in service.export_to_epub(project_id):
                yield chunk

        project = await service.get_project_info(project_id)
        filename = f"{project.title}.epub" if project else "novel.epub"

        return StreamingResponse(
            generate_file(),
            media_type="application/epub+zip",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"导出失败：{str(e)}"
        )


@router.get("/{project_id}/docx", summary="导出 DOCX 格式")
async def export_docx(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """导出项目为 DOCX 格式"""
    # 验证项目权限
    await get_project_with_auth(project_id, db, current_user)

    try:
        service = ExportService(db)

        async def generate_file():
            async for chunk in service.export_to_docx(project_id):
                yield chunk

        project = await service.get_project_info(project_id)
        filename = f"{project.title}.docx" if project else "novel.docx"

        return StreamingResponse(
            generate_file(),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"导出失败：{str(e)}"
        )
