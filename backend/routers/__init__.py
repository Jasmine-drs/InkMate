"""
API 路由
"""
from .user import router as user_router
from .project import router as project_router
from .chapter import router as chapter_router
from .unit import router as unit_router
from .character import router as character_router
from .outline import router as outline_router

__all__ = [
    "user_router",
    "project_router",
    "chapter_router",
    "unit_router",
    "character_router",
    "outline_router",
]
