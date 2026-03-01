"""
项目服务
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from models.project import Project
from schemas.project import ProjectCreate, ProjectUpdate


class ProjectService:
    """项目服务"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_project(self, project_data: ProjectCreate, user_id: str) -> Project:
        """创建项目"""
        project = Project(
            **project_data.model_dump(),
            user_id=user_id
        )
        self.db.add(project)
        await self.db.commit()
        await self.db.refresh(project)
        return project

    async def get_project(self, project_id: str) -> Project | None:
        """获取项目详情"""
        result = await self.db.execute(
            select(Project).where(Project.id == project_id)
        )
        return result.scalar_one_or_none()

    async def get_user_projects(self, user_id: str, skip: int = 0, limit: int = 20) -> tuple[list[Project], int]:
        """获取用户的项目列表"""
        # 获取总数
        count_result = await self.db.execute(
            select(func.count()).where(Project.user_id == user_id)
        )
        total = count_result.scalar() or 0

        # 获取项目列表
        result = await self.db.execute(
            select(Project)
            .where(Project.user_id == user_id)
            .order_by(Project.updated_at.desc())
            .offset(skip)
            .limit(limit)
        )
        projects = result.scalars().all()
        return list(projects), total

    async def update_project(self, project_id: str, project_data: ProjectUpdate) -> Project | None:
        """更新项目"""
        result = await self.db.execute(
            select(Project).where(Project.id == project_id)
        )
        project = result.scalar_one_or_none()
        if not project:
            return None

        update_data = project_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(project, key, value)

        await self.db.commit()
        await self.db.refresh(project)
        return project

    async def delete_project(self, project_id: str) -> bool:
        """删除项目"""
        result = await self.db.execute(
            select(Project).where(Project.id == project_id)
        )
        project = result.scalar_one_or_none()
        if not project:
            return False

        await self.db.delete(project)
        await self.db.commit()
        return True
