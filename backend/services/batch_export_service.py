"""
批量导出服务
"""
import io
import zipfile
from datetime import datetime
from typing import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession

from services.export_service import ExportService


class BatchExportService:
    """批量导出服务"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.export_service = ExportService(db)

    async def export_projects_to_zip(
        self,
        project_ids: list[str],
        format: str = "txt",
    ) -> AsyncIterator[bytes]:
        """批量导出多个项目为 ZIP 文件"""
        buffer = io.BytesIO()

        with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for project_id in project_ids:
                project = await self.export_service.get_project_info(project_id)
                if not project:
                    continue

                # 根据格式选择导出方法
                if format == "txt":
                    content_generator = self.export_service.export_to_txt(project_id)
                    extension = ".txt"
                elif format == "epub":
                    content_generator = self.export_service.export_to_epub(project_id)
                    extension = ".epub"
                elif format == "docx":
                    content_generator = self.export_service.export_to_docx(project_id)
                    extension = ".docx"
                else:
                    continue

                # 获取导出内容
                content = b""
                async for chunk in content_generator:
                    content += chunk

                # 添加到 ZIP 文件
                file_name = f"{project.title}{extension}"
                # 清理文件名中的非法字符
                file_name = "".join(c for c in file_name if c not in r'\/:*?"<>|')
                zip_file.writestr(file_name, content)

        buffer.seek(0)
        yield buffer.read()

    async def export_chapters_to_zip(
        self,
        project_id: str,
        chapter_ids: list[str],
        format: str = "txt",
    ) -> AsyncIterator[bytes]:
        """批量导出指定章节为 ZIP 文件"""
        from models.chapter import Chapter
        from sqlalchemy import select

        # 获取指定章节
        result = await self.db.execute(
            select(Chapter)
            .where(Chapter.id.in_(chapter_ids))
            .order_by(Chapter.chapter_number.asc())
        )
        chapters = result.scalars().all()

        buffer = io.BytesIO()

        with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for chapter in chapters:
                # 构建单章节内容
                content_lines = []
                content_lines.append(f"第{chapter.chapter_number}章 {chapter.title or ''}")
                content_lines.append("")

                # 移除 HTML 标签
                import re
                from html import unescape
                text = re.sub(r'<[^>]+>', ' ', chapter.content or "")
                text = unescape(text)
                text = re.sub(r'\s+', ' ', text).strip()

                content_lines.append(text)
                content_lines.append("")
                content_lines.append(f"（字数：{chapter.word_count or 0}）")

                content = "\n".join(content_lines).encode('utf-8')

                # 添加到 ZIP 文件
                file_name = f"第{chapter.chapter_number}章_{chapter.title or '无标题'}{format}"
                # 清理文件名中的非法字符
                file_name = "".join(c for c in file_name if c not in r'\/:*?"<>|')
                if format == "txt":
                    file_name += ".txt"
                elif format == "epub":
                    file_name += ".epub"
                elif format == "docx":
                    file_name += ".docx"

                zip_file.writestr(file_name, content)

        buffer.seek(0)
        yield buffer.read()
