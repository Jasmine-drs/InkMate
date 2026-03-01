"""
公共依赖函数
"""
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import TypeVar, Type, Optional

from models.project import Project
from models.user import User

T = TypeVar('T')


async def get_project_with_auth(
    project_id: str,
    db: AsyncSession,
    current_user: User,
    check_write: bool = False
) -> Project:
    """
    获取项目并验证权限

    Args:
        project_id: 项目 ID
        db: 数据库会话
        current_user: 当前用户
        check_write: 是否检查写权限（默认为读权限）

    Returns:
        Project: 项目对象

    Raises:
        HTTPException: 404 项目不存在，403 无权访问
    """
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )

    if project.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权访问该项目"
        )

    return project


async def get_resource_with_project_auth(
    model: Type[T],
    db: AsyncSession,
    current_user: User,
    resource_id: str,
    project_id_field: str = "project_id"
) -> T:
    """
    获取资源并验证项目权限

    Args:
        model: ORM 模型
        db: 数据库会话
        current_user: 当前用户
        resource_id: 资源 ID
        project_id_field: 项目 ID 字段名

    Returns:
        资源对象

    Raises:
        HTTPException: 404 资源不存在，403 无权访问
    """
    # 获取资源
    result = await db.execute(select(model).where(model.id == resource_id))
    resource = result.scalar_one_or_none()

    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="资源不存在"
        )

    # 获取项目 ID
    project_id = getattr(resource, project_id_field, None)
    if not project_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="资源关联的项目 ID 不存在"
        )

    # 验证项目权限
    await get_project_with_auth(project_id, db, current_user)

    return resource
