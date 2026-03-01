"""
Redis 客户端
"""
import redis.asyncio as redis
from config import settings

# Redis 客户端
redis_client: redis.Redis | None = None


async def get_redis() -> redis.Redis:
    """获取 Redis 客户端"""
    if redis_client is None:
        raise RuntimeError("Redis client not initialized")
    return redis_client


async def init_redis():
    """初始化 Redis 连接"""
    global redis_client
    redis_client = redis.from_url(
        settings.REDIS_URL,
        encoding="utf-8",
        decode_responses=True
    )


async def close_redis():
    """关闭 Redis 连接"""
    global redis_client
    if redis_client:
        await redis_client.close()
        redis_client = None
