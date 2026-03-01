"""
应用配置
"""
from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional


class Settings(BaseSettings):
    # 应用配置
    APP_NAME: str = "AI Novel Writing Assistant"
    DEBUG: bool = True

    # 数据库配置
    DATABASE_URL: str = "mysql+aiomysql://user:pass@localhost:3306/novel_db"

    # Redis 配置
    REDIS_URL: str = "redis://localhost:6379"

    # Milvus 向量数据库配置
    MILVUS_HOST: str = "localhost"
    MILVUS_PORT: int = 19530

    # JWT 配置
    SECRET_KEY: str = Field(..., description="JWT secret key, must be set via environment variable")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 天

    # AI 模型配置
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_BASE_URL: Optional[str] = None
    GENERATION_MODEL: str = "Qwen/Qwen2.5-7B-Instruct"  # 默认生成模型 (ModelScope)
    EMBEDDING_MODEL: str = "text-embedding-3-small"  # 默认嵌入模型
    MAX_TOKENS: int = 2048  # 最大生成 token 数
    TEMPERATURE: float = 0.7  # 生成温度

    # 速率限制配置
    RATE_LIMIT_REQUESTS: int = 10  # 每分钟最大请求数
    RATE_LIMIT_WINDOW: int = 60  # 时间窗口（秒）

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
