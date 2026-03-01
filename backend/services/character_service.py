"""
角色管理服务
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from models.character import Character
from schemas.character import CharacterCreate, CharacterUpdate


class CharacterService:
    """角色服务"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_character(
        self, project_id: str, character_data: CharacterCreate
    ) -> Character:
        """创建角色"""
        character = Character(
            project_id=project_id,
            **character_data.model_dump(),
        )
        self.db.add(character)
        await self.db.commit()
        await self.db.refresh(character)
        return character

    async def get_character(
        self, project_id: str, character_id: str
    ) -> Character | None:
        """获取角色详情"""
        result = await self.db.execute(
            select(Character).where(
                Character.id == character_id,
                Character.project_id == project_id
            )
        )
        return result.scalar_one_or_none()

    async def get_project_characters(
        self, project_id: str, skip: int = 0, limit: int = 50
    ) -> tuple[list[Character], int]:
        """获取项目的角色列表"""
        # 获取总数
        count_result = await self.db.execute(
            select(func.count()).where(Character.project_id == project_id)
        )
        total = count_result.scalar() or 0

        # 获取角色列表
        result = await self.db.execute(
            select(Character)
            .where(Character.project_id == project_id)
            .order_by(Character.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        characters = result.scalars().all()
        return list(characters), total

    async def update_character(
        self, project_id: str, character_id: str, character_data: CharacterUpdate
    ) -> Character | None:
        """更新角色"""
        result = await self.db.execute(
            select(Character).where(
                Character.id == character_id,
                Character.project_id == project_id
            )
        )
        character = result.scalar_one_or_none()
        if not character:
            return None

        update_data = character_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(character, key, value)

        await self.db.commit()
        await self.db.refresh(character)
        return character

    async def delete_character(
        self, project_id: str, character_id: str
    ) -> bool:
        """删除角色"""
        result = await self.db.execute(
            select(Character).where(
                Character.id == character_id,
                Character.project_id == project_id
            )
        )
        character = result.scalar_one_or_none()
        if not character:
            return False

        await self.db.delete(character)
        await self.db.commit()
        return True
