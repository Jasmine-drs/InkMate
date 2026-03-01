"""
AI 对话服务层
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from models.chat_message import ChatMessage
from schemas.chat import ChatMessageCreate, ChatRequest
from typing import List, Tuple, Optional
import uuid


class ChatService:
    """AI 对话服务"""

    def __init__(self, db: AsyncSession):
        self.db = db

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
