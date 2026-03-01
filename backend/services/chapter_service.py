"""
章节管理服务
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from models.chapter import Chapter
from models.chapter_version import ChapterVersion
from schemas.chapter import ChapterCreate, ChapterUpdate


class ChapterService:
    """章节服务"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_chapter(
        self, project_id: str, chapter_data: ChapterCreate, unit_id: str | None = None
    ) -> Chapter:
        """创建章节"""
        chapter = Chapter(
            project_id=project_id,
            unit_id=unit_id,
            **chapter_data.model_dump(),
        )
        self.db.add(chapter)
        await self.db.commit()
        await self.db.refresh(chapter)
        return chapter

    async def get_chapter(
        self, project_id: str, chapter_num: int
    ) -> Chapter | None:
        """获取章节详情"""
        result = await self.db.execute(
            select(Chapter).where(
                Chapter.project_id == project_id,
                Chapter.chapter_number == chapter_num
            )
        )
        return result.scalar_one_or_none()

    async def get_chapter_by_id(self, chapter_id: str) -> Chapter | None:
        """根据 ID 获取章节"""
        result = await self.db.execute(
            select(Chapter).where(Chapter.id == chapter_id)
        )
        return result.scalar_one_or_none()

    async def get_project_chapters(
        self, project_id: str, skip: int = 0, limit: int = 50
    ) -> tuple[list[Chapter], int]:
        """获取项目的章节列表"""
        # 获取总数
        count_result = await self.db.execute(
            select(func.count()).where(Chapter.project_id == project_id)
        )
        total = count_result.scalar() or 0

        # 获取章节列表
        result = await self.db.execute(
            select(Chapter)
            .where(Chapter.project_id == project_id)
            .order_by(Chapter.chapter_number.asc())
            .offset(skip)
            .limit(limit)
        )
        chapters = result.scalars().all()
        return list(chapters), total

    async def update_chapter(
        self, chapter_id: str, chapter_data: ChapterUpdate, create_version: bool = True
    ) -> Chapter | None:
        """更新章节（可选择是否创建版本）"""
        result = await self.db.execute(
            select(Chapter).where(Chapter.id == chapter_id)
        )
        chapter = result.scalar_one_or_none()
        if not chapter:
            return None

        update_data = chapter_data.model_dump(exclude_unset=True)

        # 如果需要创建版本，先保存当前内容
        if create_version and chapter.content:
            # 获取下一个版本号
            version_result = await self.db.execute(
                select(func.max(ChapterVersion.version_number)).where(
                    ChapterVersion.chapter_id == chapter_id
                )
            )
            max_version = version_result.scalar() or 0
            new_version = max_version + 1

            version = ChapterVersion(
                chapter_id=chapter_id,
                version_number=new_version,
                content=chapter.content,
            )
            self.db.add(version)

        for key, value in update_data.items():
            setattr(chapter, key, value)

        # 更新字数统计 - 使用纯文本字数（移除 HTML 标签）
        if chapter.content:
            import re
            text_content = re.sub(r'<[^>]+>', '', chapter.content)
            chapter.word_count = len(text_content)

        await self.db.commit()
        await self.db.refresh(chapter)
        return chapter

    async def delete_chapter(self, chapter_id: str) -> bool:
        """删除章节"""
        result = await self.db.execute(
            select(Chapter).where(Chapter.id == chapter_id)
        )
        chapter = result.scalar_one_or_none()
        if not chapter:
            return False

        await self.db.delete(chapter)
        await self.db.commit()
        return True

    async def get_chapter_versions(
        self, chapter_id: str, skip: int = 0, limit: int = 20
    ) -> tuple[list[ChapterVersion], int]:
        """获取章节版本历史"""
        # 获取总数
        count_result = await self.db.execute(
            select(func.count()).where(ChapterVersion.chapter_id == chapter_id)
        )
        total = count_result.scalar() or 0

        # 获取版本列表（按版本号倒序）
        result = await self.db.execute(
            select(ChapterVersion)
            .where(ChapterVersion.chapter_id == chapter_id)
            .order_by(ChapterVersion.version_number.desc())
            .offset(skip)
            .limit(limit)
        )
        versions = result.scalars().all()
        return list(versions), total

    async def get_chapter_version(
        self, chapter_id: str, version_num: int
    ) -> ChapterVersion | None:
        """获取指定版本"""
        result = await self.db.execute(
            select(ChapterVersion).where(
                ChapterVersion.chapter_id == chapter_id,
                ChapterVersion.version_number == version_num
            )
        )
        return result.scalar_one_or_none()

    async def get_next_chapter_number(self, project_id: str) -> int:
        """获取下一个可用的章节号"""
        result = await self.db.execute(
            select(func.max(Chapter.chapter_number)).where(
                Chapter.project_id == project_id
            )
        )
        max_number = result.scalar() or 0
        return max_number + 1
