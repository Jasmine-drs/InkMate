"""
数据模型 Schema
"""
from .user import (
    UserBase,
    UserCreate,
    UserLogin,
    UserResponse,
    Token,
    TokenData
)
from .common import Response, PageResponse
from .project import (
    ProjectBase,
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
)
from .chapter import (
    ChapterBase,
    ChapterCreate,
    ChapterUpdate,
    ChapterResponse,
    ChapterVersionResponse,
)
from .unit import (
    UnitBase,
    UnitCreate,
    UnitUpdate,
    UnitResponse,
)
from .character import (
    CharacterBase,
    CharacterCreate,
    CharacterUpdate,
    CharacterResponse,
)
from .outline import (
    OutlineBase,
    OutlineCreate,
    OutlineUpdate,
    OutlineResponse,
)
from .chat import (
    ChatMessageCreate,
    ChatMessageResponse,
    ChatRequest,
    ChatHistoryResponse,
)

__all__ = [
    # User
    "UserBase",
    "UserCreate",
    "UserLogin",
    "UserResponse",
    "Token",
    "TokenData",
    # Common
    "Response",
    "PageResponse",
    # Project
    "ProjectBase",
    "ProjectCreate",
    "ProjectUpdate",
    "ProjectResponse",
    # Chapter
    "ChapterBase",
    "ChapterCreate",
    "ChapterUpdate",
    "ChapterResponse",
    "ChapterVersionResponse",
    # Unit
    "UnitBase",
    "UnitCreate",
    "UnitUpdate",
    "UnitResponse",
    # Character
    "CharacterBase",
    "CharacterCreate",
    "CharacterUpdate",
    "CharacterResponse",
    # Outline
    "OutlineBase",
    "OutlineCreate",
    "OutlineUpdate",
    "OutlineResponse",
    # Chat
    "ChatMessageCreate",
    "ChatMessageResponse",
    "ChatRequest",
    "ChatHistoryResponse",
]
