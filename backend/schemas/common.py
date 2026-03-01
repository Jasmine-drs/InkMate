"""
通用 Schema
"""
from pydantic import BaseModel
from typing import TypeVar, Generic, Optional

T = TypeVar('T')


class Response(BaseModel, Generic[T]):
    """通用响应"""
    code: int = 0
    message: str = "success"
    data: Optional[T] = None


class PageResponse(BaseModel, Generic[T]):
    """分页响应"""
    items: list[T]
    total: int
    page: int
    page_size: int
    has_next: bool
