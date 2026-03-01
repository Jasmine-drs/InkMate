"""
Milvus 向量数据库客户端
"""
from pymilvus import MilvusClient, DataType
from config import settings

# Milvus 客户端
milvus_client: MilvusClient | None = None


def get_milvus() -> MilvusClient:
    """获取 Milvus 客户端"""
    if milvus_client is None:
        raise RuntimeError("Milvus client not initialized")
    return milvus_client


def init_milvus():
    """初始化 Milvus 连接"""
    global milvus_client
    milvus_client = MilvusClient(
        uri=f"http://{settings.MILVUS_HOST}:{settings.MILVUS_PORT}"
    )


def close_milvus():
    """关闭 Milvus 连接"""
    global milvus_client
    if milvus_client:
        milvus_client.close()
        milvus_client = None


def create_collections():
    """创建必要的集合"""
    client = get_milvus()

    # 章节内容向量集合
    collections = client.list_collections()
    if "chapter_embeddings" not in collections:
        client.create_collection(
            collection_name="chapter_embeddings",
            dimension=1536,  # OpenAI embedding 维度
            metric_type="COSINE",
            auto_id=True
        )

    # 设定内容向量集合
    collections = client.list_collections()
    if "setting_embeddings" not in collections:
        client.create_collection(
            collection_name="setting_embeddings",
            dimension=1536,
            metric_type="COSINE",
            auto_id=True
        )
