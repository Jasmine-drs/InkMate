"""
大纲管理服务
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from models.outline import Outline
from schemas.outline import OutlineCreate, OutlineUpdate
from utils.ai_client import get_ai_client
from typing import Optional, AsyncGenerator
import uuid


class OutlineService:
    """大纲服务"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_outline(
        self, project_id: str, outline_data: OutlineCreate, unit_id: str | None = None
    ) -> Outline:
        """创建大纲"""
        outline = Outline(
            project_id=project_id,
            unit_id=unit_id,
            **outline_data.model_dump(),
        )
        self.db.add(outline)
        await self.db.commit()
        await self.db.refresh(outline)
        return outline

    async def get_outline(
        self, project_id: str, outline_id: str
    ) -> Outline | None:
        """获取大纲详情"""
        result = await self.db.execute(
            select(Outline).where(
                Outline.id == outline_id,
                Outline.project_id == project_id
            )
        )
        return result.scalar_one_or_none()

    async def get_project_outlines(
        self, project_id: str, outline_type: str | None = None,
        unit_id: str | None = None, skip: int = 0, limit: int = 50
    ) -> tuple[list[Outline], int]:
        """获取项目的大纲列表"""
        # 构建查询条件
        conditions = [Outline.project_id == project_id]
        if outline_type:
            conditions.append(Outline.outline_type == outline_type)
        if unit_id:
            conditions.append(Outline.unit_id == unit_id)

        # 获取总数
        count_result = await self.db.execute(
            select(func.count()).select_from(Outline).where(*conditions)
        )
        total = count_result.scalar() or 0

        # 获取大纲列表
        result = await self.db.execute(
            select(Outline)
            .where(*conditions)
            .order_by(Outline.sort_order.asc(), Outline.created_at.asc())
            .offset(skip)
            .limit(limit)
        )
        outlines = result.scalars().all()
        return list(outlines), total

    async def update_outline(
        self, project_id: str, outline_id: str, outline_data: OutlineUpdate
    ) -> Outline | None:
        """更新大纲"""
        result = await self.db.execute(
            select(Outline).where(
                Outline.id == outline_id,
                Outline.project_id == project_id
            )
        )
        outline = result.scalar_one_or_none()
        if not outline:
            return None

        update_data = outline_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(outline, key, value)

        await self.db.commit()
        await self.db.refresh(outline)
        return outline

    async def delete_outline(
        self, project_id: str, outline_id: str
    ) -> bool:
        """删除大纲"""
        result = await self.db.execute(
            select(Outline).where(
                Outline.id == outline_id,
                Outline.project_id == project_id
            )
        )
        outline = result.scalar_one_or_none()
        if not outline:
            return False

        await self.db.delete(outline)
        await self.db.commit()
        return True

    async def generate_outline(
        self,
        project_id: str,
        theme: str,
        description: str,
        world_view: Optional[str] = None,
        outline_type: str = "main",
        unit_id: Optional[str] = None,
    ) -> Outline:
        """AI 生成大纲"""
        ai = get_ai_client()

        # 构建系统提示
        system_prompt = """你是一个专业的小说策划助手，擅长创作引人入胜的小说大纲。
请根据用户提供的主题、简介和设定，生成结构完整、情节吸引人的大纲。

要求：
1. 大纲结构清晰，包含起承转合
2. 情节发展合理，有高潮和转折
3. 角色成长弧线明确
4. 符合给定的世界观设定"""

        # 构建用户提示
        prompt_parts = [
            f"小说主题：{theme}",
            f"小说简介：{description}",
        ]
        if world_view:
            prompt_parts.append(f"世界观设定：{world_view}")

        if outline_type == "main":
            prompt_parts.append(
                "\n请生成主线大纲，包含：\n"
                "1. 故事背景\n"
                "2. 主要角色\n"
                "3. 核心冲突\n"
                "4. 情节发展（开端、发展、高潮、结局）\n"
                "5. 主题思想"
            )
        elif outline_type == "unit":
            prompt_parts.append(
                "\n请生成单元大纲，包含：\n"
                "1. 单元标题\n"
                "2. 本单元核心事件\n"
                "3. 涉及角色\n"
                "4. 情节概要\n"
                "5. 与主线的关联"
            )

        prompt = "\n".join(prompt_parts)

        # 调用 AI 生成
        content = await ai.generate(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=0.7,
        )

        # 创建大纲记录
        outline = Outline(
            id=str(uuid.uuid4()),
            project_id=project_id,
            unit_id=unit_id,
            outline_type=outline_type,
            content=content,
            sort_order=0,
        )
        self.db.add(outline)
        await self.db.commit()
        await self.db.refresh(outline)
        return outline

    async def generate_outline_stream(
        self,
        project_id: str,
        theme: str,
        description: str,
        world_view: Optional[str] = None,
        outline_type: str = "main",
        unit_id: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        """AI 生成大纲（流式）"""
        ai = get_ai_client()

        if not ai.api_key:
            yield ""
            return

        # 构建系统提示
        system_prompt = """你是一个专业的小说策划助手，擅长创作引人入胜的小说大纲。
请根据用户提供的主题、简介和设定，生成结构完整、情节吸引人的大纲。

要求：
1. 大纲结构清晰，包含起承转合
2. 情节发展合理，有高潮和转折
3. 角色成长弧线明确
4. 符合给定的世界观设定"""

        # 构建用户提示
        prompt_parts = [
            f"小说主题：{theme}",
            f"小说简介：{description}",
        ]
        if world_view:
            prompt_parts.append(f"世界观设定：{world_view}")

        if outline_type == "main":
            prompt_parts.append(
                "\n请生成主线大纲，包含：\n"
                "1. 故事背景\n"
                "2. 主要角色\n"
                "3. 核心冲突\n"
                "4. 情节发展（开端、发展、高潮、结局）\n"
                "5. 主题思想"
            )
        elif outline_type == "unit":
            prompt_parts.append(
                "\n请生成单元大纲，包含：\n"
                "1. 单元标题\n"
                "2. 本单元核心事件\n"
                "3. 涉及角色\n"
                "4. 情节概要\n"
                "5. 与主线的关联"
            )

        prompt = "\n".join(prompt_parts)

        # 流式生成并保存
        content_chunks = []
        async for token in ai.generate_stream(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=0.7,
        ):
            content_chunks.append(token)
            yield token

        # 保存完整内容到数据库
        content = "".join(content_chunks)
        outline = Outline(
            id=str(uuid.uuid4()),
            project_id=project_id,
            unit_id=unit_id,
            outline_type=outline_type,
            content=content,
            sort_order=0,
        )
        self.db.add(outline)
        await self.db.commit()
        await self.db.refresh(outline)

    async def breakdown_to_chapters(
        self,
        project_id: str,
        outline_id: str,
        chapter_count: int = 10,
    ) -> list[Outline]:
        """根据大纲拆解章节细纲"""
        # 获取源大纲
        source_outline = await self.get_outline(project_id, outline_id)
        if not source_outline:
            raise ValueError("大纲不存在")

        ai = get_ai_client()

        # 构建系统提示
        system_prompt = """你是一个专业的小说结构规划师，擅长将大纲拆解为合理的章节结构。
请根据给定大纲，规划出章节细纲，使情节分配合理，节奏张弛有度。

要求：
1. 每章有明确的核心事件
2. 章节间有合理的起承转合
3. 保持悬念和吸引力
4. 章节长度适中，情节分布均匀"""

        # 构建用户提示
        prompt = f"""大纲内容：
{source_outline.content}

请将此大纲拆解为{chapter_count}个章节的细纲，每章包含：
1. 章节号
2. 章节标题
3. 核心事件
4. 情节要点
5. 角色发展"""

        # 调用 AI 生成
        response = await ai.generate(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=0.7,
        )

        # 解析 AI 响应，创建章节细纲
        # 假设 AI 返回的格式是结构化的，需要解析
        chapters = []

        # 简单解析：按章节号分割
        import re
        chapter_pattern = r'第 [一二三四五六七八九十百\d]+章|Chapter\s*\d+|\d+\.'
        matches = list(re.finditer(chapter_pattern, response))

        for i, match in enumerate(matches):
            start = match.start()
            end = matches[i + 1].start() if i + 1 < len(matches) else len(response)
            chapter_content = response[start:end].strip()

            chapter = Outline(
                id=str(uuid.uuid4()),
                project_id=project_id,
                outline_type="chapter",
                parent_id=outline_id,
                chapter_number=i + 1,
                content=chapter_content,
                sort_order=i,
            )
            self.db.add(chapter)
            chapters.append(chapter)

        # 如果没有解析出章节，将整个响应作为一章
        if not chapters:
            chapter = Outline(
                id=str(uuid.uuid4()),
                project_id=project_id,
                outline_type="chapter",
                parent_id=outline_id,
                chapter_number=1,
                content=response,
                sort_order=0,
            )
            self.db.add(chapter)
            chapters.append(chapter)

        await self.db.commit()
        for chapter in chapters:
            await self.db.refresh(chapter)

        return chapters

    async def breakdown_to_chapters_stream(
        self,
        project_id: str,
        outline_id: str,
        chapter_count: int = 10,
    ) -> AsyncGenerator[str, None]:
        """根据大纲拆解章节细纲（流式）"""
        # 获取源大纲
        source_outline = await self.get_outline(project_id, outline_id)
        if not source_outline:
            raise ValueError("大纲不存在")

        ai = get_ai_client()

        if not ai.api_key:
            yield ""
            return

        # 构建系统提示
        system_prompt = """你是一个专业的小说结构规划师，擅长将大纲拆解为合理的章节结构。
请根据给定大纲，规划出章节细纲，使情节分配合理，节奏张弛有度。

要求：
1. 每章有明确的核心事件
2. 章节间有合理的起承转合
3. 保持悬念和吸引力
4. 章节长度适中，情节分布均匀"""

        # 构建用户提示
        prompt = f"""大纲内容：
{source_outline.content}

请将此大纲拆解为{chapter_count}个章节的细纲，每章包含：
1. 章节号
2. 章节标题
3. 核心事件
4. 情节要点
5. 角色发展"""

        # 流式生成并保存
        content_chunks = []
        async for token in ai.generate_stream(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=0.7,
        ):
            content_chunks.append(token)
            yield token

        # 解析并保存章节
        content = "".join(content_chunks)
        import re
        chapter_pattern = r'第 [一二三四五六七八九十百\d]+章|Chapter\s*\d+|\d+\.'
        matches = list(re.finditer(chapter_pattern, content))

        chapters = []
        for i, match in enumerate(matches):
            start = match.start()
            end = matches[i + 1].start() if i + 1 < len(matches) else len(content)
            chapter_content = content[start:end].strip()

            chapter = Outline(
                id=str(uuid.uuid4()),
                project_id=project_id,
                outline_type="chapter",
                parent_id=outline_id,
                chapter_number=i + 1,
                content=chapter_content,
                sort_order=i,
            )
            self.db.add(chapter)
            chapters.append(chapter)

        if not chapters:
            chapter = Outline(
                id=str(uuid.uuid4()),
                project_id=project_id,
                outline_type="chapter",
                parent_id=outline_id,
                chapter_number=1,
                content=content,
                sort_order=0,
            )
            self.db.add(chapter)
            chapters.append(chapter)

        await self.db.commit()
