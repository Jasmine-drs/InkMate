"""
状态追踪服务
支持 AI 自动提取追踪记录
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from models.tracking_record import TrackingRecord
from schemas.tracking import TrackingCreate, TrackingUpdate, TrackingType
from typing import Optional, List, Dict, Any
import json
import re


class TrackingService:
    """状态追踪服务"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def extract_from_chapter_ai(
        self,
        project_id: str,
        chapter_id: str,
        chapter_content: str,
        chapter_number: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        使用 AI 从章节内容自动提取状态追踪记录

        Args:
            project_id: 项目 ID
            chapter_id: 章节 ID
            chapter_content: 章节内容
            chapter_number: 章节号（可选）

        Returns:
            提取的追踪记录列表
        """
        from utils.ai_client import get_ai_client

        ai = get_ai_client()

        # 构建 AI 提示
        system_prompt = """你是一个专业的小说内容分析助手，擅长从章节内容中提取关键信息。
请分析以下章节内容，提取以下类型的状态追踪信息：

1. character_state (角色状态)：角色的位置、情绪、关系变化等
2. foreshadowing (伏笔)：埋设的伏笔、悬念、未解之谜
3. item (物品追踪)：重要物品的出现、转移、状态变化
4. timeline (时间线)：重要事件的发生时间和顺序

请以 JSON 格式返回，格式如下：
{
    "trackings": [
        {
            "tracking_type": "character_state",
            "entity_id": "角色名或自定义标识",
            "state_data": {
                "key": "value",
                ...
            }
        },
        ...
    ]
}

如果某类信息不存在，请不要包含在结果中。"""

        # 截取章节内容前 3000 字符用于分析
        content_preview = chapter_content[:3000] if len(chapter_content) > 3000 else chapter_content

        # 移除 HTML 标签
        from html import unescape
        text_content = re.sub(r'<[^>]+>', ' ', content_preview or "")
        text_content = unescape(text_content)
        text_content = re.sub(r'\s+', ' ', text_content).strip()

        prompt = f"""请分析以下章节内容，提取状态追踪信息：

章节内容：
{text_content}

请返回 JSON 格式的提取结果。"""

        try:
            # 调用 AI 分析
            response = await ai.generate(
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=0.3,  # 较低温度以确保输出格式稳定
            )

            # 解析 JSON 响应
            import json
            result = json.loads(response)
            extracted_trackings = result.get("trackings", [])

            # 为每个提取的记录添加项目 ID 和章节信息
            for tracking in extracted_trackings:
                tracking["project_id"] = project_id
                if chapter_number:
                    tracking["chapter_number"] = chapter_number

            return extracted_trackings

        except Exception as e:
            # AI 分析失败，返回空列表
            return []

    async def save_extracted_trackings(
        self,
        extracted_trackings: List[Dict[str, Any]],
    ) -> List[TrackingRecord]:
        """
        保存 AI 提取的追踪记录

        Args:
            extracted_trackings: AI 提取的追踪记录列表

        Returns:
            保存的追踪记录列表
        """
        saved_trackings = []

        for tracking_data in extracted_trackings:
            try:
                # 验证必需字段
                if not tracking_data.get("project_id") or not tracking_data.get("tracking_type"):
                    continue

                # 创建 TrackingCreate 对象
                create_data = TrackingCreate(
                    tracking_type=tracking_data["tracking_type"],
                    entity_id=tracking_data.get("entity_id"),
                    chapter_number=tracking_data.get("chapter_number"),
                    state_data=tracking_data.get("state_data", {}),
                )

                # 创建追踪记录
                tracking = await self.create_tracking_from_data(create_data)
                saved_trackings.append(tracking)
            except Exception as e:
                # 单条记录保存失败，继续处理其他记录
                continue

        return saved_trackings

    async def create_tracking_from_data(
        self, tracking_data: TrackingCreate
    ) -> TrackingRecord:
        """从 TrackingCreate 数据创建追踪记录"""
        tracking = TrackingRecord(
            project_id=tracking_data.project_id if hasattr(tracking_data, 'project_id') else None,
            tracking_type=tracking_data.tracking_type,
            entity_id=tracking_data.entity_id,
            chapter_number=tracking_data.chapter_number,
            state_data=tracking_data.state_data,
        )
        self.db.add(tracking)
        await self.db.commit()
        await self.db.refresh(tracking)
        return tracking

    async def create_tracking(
        self, project_id: str, tracking_data: TrackingCreate
    ) -> TrackingRecord:
        """创建状态追踪记录"""
        tracking = TrackingRecord(
            project_id=project_id,
            **tracking_data.model_dump(),
        )
        self.db.add(tracking)
        await self.db.commit()
        await self.db.refresh(tracking)
        return tracking

    async def get_tracking(
        self, project_id: str, tracking_id: str
    ) -> TrackingRecord | None:
        """获取单条追踪记录"""
        result = await self.db.execute(
            select(TrackingRecord).where(
                TrackingRecord.id == tracking_id,
                TrackingRecord.project_id == project_id
            )
        )
        return result.scalar_one_or_none()

    async def get_project_trackings(
        self, project_id: str,
        tracking_type: TrackingType | None = None,
        entity_id: str | None = None,
        skip: int = 0,
        limit: int = 50
    ) -> tuple[list[TrackingRecord], int]:
        """获取项目的追踪记录列表

        Args:
            project_id: 项目 ID
            tracking_type: 追踪类型过滤（可选）
            entity_id: 实体 ID 过滤（可选）
            skip: 跳过记录数
            limit: 返回记录数限制

        Returns:
            (追踪记录列表，总记录数)
        """
        # 构建基础查询
        base_query = select(TrackingRecord).where(
            TrackingRecord.project_id == project_id
        )

        # 添加类型过滤
        if tracking_type:
            base_query = base_query.where(TrackingRecord.tracking_type == tracking_type.value)

        # 添加实体 ID 过滤
        if entity_id:
            base_query = base_query.where(TrackingRecord.entity_id == entity_id)

        # 获取总数
        count_query = select(func.count()).select_from(base_query.subquery())
        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0

        # 获取记录列表
        query = base_query.order_by(TrackingRecord.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(query)
        trackings = result.scalars().all()

        return list(trackings), total

    async def get_trackings_by_entity(
        self, project_id: str, entity_id: str
    ) -> list[TrackingRecord]:
        """获取实体的所有追踪记录"""
        result = await self.db.execute(
            select(TrackingRecord).where(
                TrackingRecord.project_id == project_id,
                TrackingRecord.entity_id == entity_id
            ).order_by(TrackingRecord.created_at.asc())
        )
        return list(result.scalars().all())

    async def update_tracking(
        self, project_id: str, tracking_id: str, tracking_data: TrackingUpdate
    ) -> TrackingRecord | None:
        """更新追踪记录"""
        result = await self.db.execute(
            select(TrackingRecord).where(
                TrackingRecord.id == tracking_id,
                TrackingRecord.project_id == project_id
            )
        )
        tracking = result.scalar_one_or_none()
        if not tracking:
            return None

        update_data = tracking_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(tracking, key, value)

        await self.db.commit()
        await self.db.refresh(tracking)
        return tracking

    async def delete_tracking(
        self, project_id: str, tracking_id: str
    ) -> bool:
        """删除追踪记录"""
        result = await self.db.execute(
            select(TrackingRecord).where(
                TrackingRecord.id == tracking_id,
                TrackingRecord.project_id == project_id
            )
        )
        tracking = result.scalar_one_or_none()
        if not tracking:
            return False

        await self.db.delete(tracking)
        await self.db.commit()
        return True

    async def get_latest_tracking(
        self, project_id: str, tracking_type: TrackingType, entity_id: str
    ) -> TrackingRecord | None:
        """获取实体最新的追踪记录"""
        result = await self.db.execute(
            select(TrackingRecord).where(
                TrackingRecord.project_id == project_id,
                TrackingRecord.tracking_type == tracking_type.value,
                TrackingRecord.entity_id == entity_id
            ).order_by(TrackingRecord.created_at.desc()).limit(1)
        )
        return result.scalar_one_or_none()
