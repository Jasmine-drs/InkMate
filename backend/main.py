"""
AI 单元剧小说创作助手 - 后端服务
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from db import init_db, close_db
from utils import init_redis, close_redis, init_milvus, close_milvus, create_collections, init_ai, close_ai
from routers.user import router as user_router
from routers.project import router as project_router
from routers.chapter import router as chapter_router
from routers.unit import router as unit_router
from routers.character import router as character_router
from routers.outline import router as outline_router
from routers.ai_generation import router as ai_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时初始化
    logger.info("初始化数据库连接...")
    await init_db()

    logger.info("初始化 Redis 连接...")
    await init_redis()

    logger.info("初始化 Milvus 连接...")
    init_milvus()
    create_collections()

    logger.info("初始化 AI 客户端...")
    await init_ai()

    logger.info("应用启动完成")

    yield

    # 关闭时清理
    logger.info("关闭数据库连接...")
    await close_db()

    logger.info("关闭 Redis 连接...")
    await close_redis()

    logger.info("关闭 Milvus 连接...")
    close_milvus()

    logger.info("关闭 AI 客户端...")
    await close_ai()

    logger.info("应用已关闭")


app = FastAPI(
    title="AI Novel Writing Assistant API",
    description="API service for AI unit drama novel creation tool",
    version="0.1.0",
    lifespan=lifespan
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(user_router, prefix="/api")
app.include_router(project_router, prefix="/api")
app.include_router(chapter_router, prefix="/api")
app.include_router(unit_router, prefix="/api")
app.include_router(character_router, prefix="/api")
app.include_router(outline_router, prefix="/api")
app.include_router(ai_router, prefix="/api")


@app.get("/")
async def root():
    return {"message": "AI Novel Writing Assistant API", "version": "0.1.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
