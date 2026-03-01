"""
AI 对话服务层
支持上下文设定联动
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from models.chat_message import ChatMessage
from models.project import Project
from schemas.chat import ChatMessageCreate, ChatRequest
from typing import List, Tuple, Optional, Dict, Any
import uuid
import json


class ChatService:
    """AI 对话服务"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_project_settings(self, project_id: str) -> Optional[Dict[str, Any]]:
        """获取项目设定（用于 AI 对话上下文）"""
        result = await self.db.execute(
            select(Project).where(Project.id == project_id)
        )
        project = result.scalar_one_or_none()
        if project and project.settings:
            return project.settings
        return None

    async def get_chapter_content(self, chapter_id: str) -> Optional[str]:
        """获取章节内容（用于 AI 对话上下文）"""
        from models.chapter import Chapter
        result = await self.db.execute(
            select(Chapter).where(Chapter.id == chapter_id)
        )
        chapter = result.scalar_one_or_none()
        if chapter:
            return chapter.content
        return None

    async def get_characters_by_project(self, project_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """获取项目角色列表（用于 AI 对话上下文）"""
        from models.character import Character
        result = await self.db.execute(
            select(Character)
            .where(Character.project_id == project_id)
            .limit(limit)
        )
        characters = result.scalars().all()
        return [
            {
                "name": char.name,
                "role_type": char.role_type,
                "card_data": char.card_data,
            }
            for char in characters
        ]

    async def build_chat_context(
        self,
        project_id: str,
        chapter_id: Optional[str] = None,
    ) -> str:
        """
        构建 AI 对话上下文（包含项目设定、角色信息、章节内容）

        Args:
            project_id: 项目 ID
            chapter_id: 章节 ID（可选）

        Returns:
            上下文文本
        """
        context_parts = []

        # 获取项目设定
        settings = await self.get_project_settings(project_id)
        if settings:
            settings_text = "=== 世界观设定 ===\n"
            if settings.get("worldView"):
                settings_text += f"世界观：{settings['worldView']}\n"
            if settings.get("powerSystem"):
                settings_text += f"力量体系：{settings['powerSystem']}\n"
            if settings.get("magic"):
                settings_text += f"魔法设定：{settings['magic']}\n"
            if settings.get("technology"):
                settings_text += f"科技水平：{settings['technology']}\n"
            if settings.get("culture"):
                settings_text += f"文化习俗：{settings['culture']}\n"
            if settings.get("history"):
                settings_text += f"历史背景：{settings['history']}\n"
            context_parts.append(settings_text)

        # 获取角色信息
        characters = await self.get_characters_by_project(project_id)
        if characters:
            characters_text = "=== 主要角色 ===\n"
            for char in characters:
                card_data = char.get("card_data", {})
                characters_text += f"- {char['name']} ({char['role_type']}): "
                if isinstance(card_data, dict):
                    if card_data.get("brief"):
                        characters_text += f"{card_data['brief']}\n"
                    elif card_data.get("description"):
                        characters_text += f"{card_data['description']}\n"
                    else:
                        characters_text += "暂无描述\n"
                else:
                    characters_text += "暂无描述\n"
            context_parts.append(characters_text)

        # 获取章节内容（如果有）
        if chapter_id:
            content = await self.get_chapter_content(chapter_id)
            if content:
                # 移除 HTML 标签
                import re
                from html import unescape
                text = re.sub(r'<[^>]+>', ' ', content or "")
                text = unescape(text)
                text = re.sub(r'\s+', ' ', text).strip()

                # 只取前 2000 字符作为上下文
                if len(text) > 2000:
                    text = text[:2000] + "..."

                context_parts.append(f"=== 当前章节内容 ===\n{text}")

        return "\n\n".join(context_parts) if context_parts else ""

    async def create_message(self, message_data: ChatMessageCreate) -> ChatMessage:
        """创建对话消息"""
        message = ChatMessage(
            id=str(uuid.uuid4()),
            project_id=message_data.project_id,
            chapter_id=message_data.chapter_id,
            role=message_data.role,
            content=message_data.content,
        )
        self.db.add(message)
        await self.db.commit()
        await self.db.refresh(message)
        return message

    async def get_messages(
        self,
        project_id: str,
        chapter_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[ChatMessage], int]:
        """
        获取对话历史

        Args:
            project_id: 项目 ID
            chapter_id: 章节 ID（可选，用于过滤特定章节的对话）
            limit: 返回数量限制
            offset: 偏移量

        Returns:
            (消息列表，总数)
        """
        # 构建查询条件
        query = select(ChatMessage).where(ChatMessage.project_id == project_id)

        if chapter_id:
            query = query.where(ChatMessage.chapter_id == chapter_id)

        # 获取总数
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # 按创建时间倒序排列，获取最新消息
        query = query.order_by(desc(ChatMessage.created_at)).limit(limit).offset(offset)

        result = await self.db.execute(query)
        messages = result.scalars().all()

        # 反转顺序，使旧消息在前
        messages = list(reversed(messages))

        return messages, total

    async def get_messages_by_session(
        self,
        project_id: str,
        chapter_id: Optional[str] = None,
        limit: int = 20,
    ) -> List[ChatMessage]:
        """
        获取最近一次会话的对话记录（用于 AI 上下文）

        Args:
            project_id: 项目 ID
            chapter_id: 章节 ID（可选）
            limit: 获取最近 N 条消息

        Returns:
            消息列表（按时间顺序）
        """
        messages, _ = await self.get_messages(
            project_id=project_id,
            chapter_id=chapter_id,
            limit=limit,
            offset=0,
        )
        return messages

    async def delete_messages(
        self,
        project_id: str,
        chapter_id: Optional[str] = None,
    ) -> int:
        """
        删除对话记录

        Args:
            project_id: 项目 ID
            chapter_id: 章节 ID（可选）

        Returns:
            删除的消息数量
        """
        query = select(ChatMessage).where(ChatMessage.project_id == project_id)

        if chapter_id:
            query = query.where(ChatMessage.chapter_id == chapter_id)

        result = await self.db.execute(query)
        messages = result.scalars().all()

        for message in messages:
            await self.db.delete(message)

        await self.db.commit()
        return len(messages)
