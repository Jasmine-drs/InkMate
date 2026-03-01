#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI 单元剧小说创作助手 - Milvus 向量库初始化脚本

基于 PROJECT_PLAN.md 设计：
- 章节内容向量集合：用于相关历史章节检索、前情提要生成
- 设定内容向量集合：用于世界观、角色卡、物品等设定检索

向量维度：4096（支持本地模型如 sentence-transformers 等高维 embedding）
索引类型：IVF_FLAT + COSINE 相似度
"""

from pymilvus import (
    connections,
    Collection,
    FieldSchema,
    CollectionSchema,
    DataType,
    utility,
)

# 向量维度（按需求固定为 4096）
VECTOR_DIM = 4096

# 集合名称
COLLECTION_CHAPTER = "chapter_embeddings"
COLLECTION_SETTING = "setting_embeddings"


def connect(host: str = "localhost", port: int = 19530):
    """连接 Milvus 服务"""
    connections.connect(alias="default", host=host, port=port)


def create_chapter_collection():
    """创建章节内容向量集合（用于相关历史章节检索、前情提要等）"""
    if utility.has_collection(COLLECTION_CHAPTER):
        utility.drop_collection(COLLECTION_CHAPTER)

    fields = [
        FieldSchema(name="id", dtype=DataType.INT64, is_primary=True, auto_id=True),
        FieldSchema(name="project_id", dtype=DataType.VARCHAR, max_length=36),
        FieldSchema(name="chapter_id", dtype=DataType.VARCHAR, max_length=36),
        FieldSchema(name="chapter_number", dtype=DataType.INT64),
        FieldSchema(name="unit_id", dtype=DataType.VARCHAR, max_length=36),
        FieldSchema(name="content", dtype=DataType.VARCHAR, max_length=65535),
        FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=VECTOR_DIM),
    ]
    schema = CollectionSchema(fields=fields, description="章节内容向量，用于上下文检索")
    coll = Collection(name=COLLECTION_CHAPTER, schema=schema)

    index_params = {
        "metric_type": "COSINE",
        "index_type": "IVF_FLAT",
        "params": {"nlist": 1024},
    }
    coll.create_index(field_name="embedding", index_params=index_params)
    return coll


def create_setting_collection():
    """创建设定内容向量集合（世界观、角色、物品等设定检索）"""
    if utility.has_collection(COLLECTION_SETTING):
        utility.drop_collection(COLLECTION_SETTING)

    fields = [
        FieldSchema(name="id", dtype=DataType.INT64, is_primary=True, auto_id=True),
        FieldSchema(name="project_id", dtype=DataType.VARCHAR, max_length=36),
        FieldSchema(name="setting_type", dtype=DataType.VARCHAR, max_length=50),
        FieldSchema(name="entity_id", dtype=DataType.VARCHAR, max_length=36),
        FieldSchema(name="content", dtype=DataType.VARCHAR, max_length=65535),
        FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=VECTOR_DIM),
    ]
    schema = CollectionSchema(fields=fields, description="设定内容向量：worldview, character, item 等")
    coll = Collection(name=COLLECTION_SETTING, schema=schema)

    index_params = {
        "metric_type": "COSINE",
        "index_type": "IVF_FLAT",
        "params": {"nlist": 1024},
    }
    coll.create_index(field_name="embedding", index_params=index_params)
    return coll


def main():
    import os
    host = os.environ.get("MILVUS_HOST", "localhost")
    port = int(os.environ.get("MILVUS_PORT", "19530"))
    connect(host=host, port=port)
    create_chapter_collection()
    create_setting_collection()
    print(f"Milvus 集合已创建，向量维度：{VECTOR_DIM}")
    print(f"  - {COLLECTION_CHAPTER}")
    print(f"  - {COLLECTION_SETTING}")


if __name__ == "__main__":
    main()
