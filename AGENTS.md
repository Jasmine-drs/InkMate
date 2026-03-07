# AGENTS.md

本文档为 Codex (Codex.ai/code) 在本仓库中提供开发指导。

## 项目概述

AI 单元剧小说创作助手 (InkMate) - 一款人机协作的 AI 小说创作工具，以单元剧小说为核心场景。系统强调章节级生成与人工主导的创作流程，而非全自动批量生成。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Vite |
| UI 组件库 | Ant Design 5.x |
| 状态管理 | Zustand + TanStack Query |
| HTTP 客户端 | Axios |
| 后端 | FastAPI (Python) + SQLAlchemy (async) |
| 数据库 | MySQL 8.0+ (aiomysql) |
| 向量数据库 | Milvus 2.x |
| 缓存 | Redis |
| 认证 | JWT (python-jose) + bcrypt |

# Project Operating Mode

- Goal: 完成【<你的长程任务名称>】，在**不中断**的前提下，充分并行子任务，直到产出完整、可验证的交付物。
- Autonomy: 允许在本仓库内创建/修改/删除文件；禁止写入 `node_modules`, `.git`, `dist`, `build`, `~` 与上级目录。
- Parallelism: 同时运行 ≤ <N> 个并行任务（可弹性：队列剩余任务排队）。
- Edit Policy: 默认使用“Auto-accept plan”（先给出计划，随后自动执行，无需逐步确认）。
- Checkpointing: 每轮重大变更后，**必须**更新 `PLAN.md` 与 `TASKS.md`，以便断点续跑。
- Validation First: 任何子任务完成后，都要跑对应校验（构建/测试/脚本），不通过则自我修复后再进入下一个任务。
- Git Discipline: 每完成一次可独立提交的任务，并且相关校验通过后，**必须**立即执行一次 Git 提交，确保变更按任务粒度落盘。

## 开发命令

### 后端
```bash
cd backend
# 使用 conda 虚拟环境 (WSL)
source /mnt/d/code/tool/data/miniconda3/envs/InkMate/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 前端
```bash
cd frontend
npm install
npm run dev      # 开发服务器 localhost:3000
npm run build    # 生产构建
npm run lint     # ESLint 检查
```

### Docker (基础设施)
```bash
docker-compose up -d  # 启动 Milvus, MinIO, etcd
# 后端通过 standalone:19530 连接 Milvus
```

## 架构

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   前端      │────▶│   后端      │────▶│   MySQL     │
│ React+TS    │◀────│   FastAPI   │◀────│   (RDBMS)   │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   Milvus    │
                    │  (向量库)   │
                    └─────────────┘
                           ▲
                           │
                    ┌─────────────┐
                    │   Redis     │
                    │  (缓存)     │
                    └─────────────┘
```

### 后端结构
```
backend/
├── main.py           # FastAPI 应用、CORS、路由注册
├── config.py         # Pydantic 配置 (从 .env 读取)
├── routers/          # API 端点 (auth, user, project)
├── models/           # SQLAlchemy ORM 模型
├── schemas/          # Pydantic 请求/响应 Schema
├── services/         # 业务逻辑层
├── db/               # 数据库会话管理
└── utils/            # Milvus, Redis, 安全工具
```

### 前端结构
```
frontend/src/
├── pages/            # 路由页面 (Dashboard, Editor, Login 等)
├── router/           # React Router 配置
├── services/         # API 客户端封装
├── store/            # Zustand stores + TanStack Query
├── utils/            # 工具 (axios, queryClient)
└── App.tsx           # 主应用组件
```

## 数据模型

### 核心表
- **users** - 用户认证
- **projects** - 小说项目 (支持 `novel` 和 `unit_drama` 类型)
- **units** - 单元结构 (单元剧专用)
- **characters** - 角色卡，JSON `card_data` 存储完整信息
- **outlines** - 层级大纲 (主线/单元/章节)
- **chapters** - 章节内容，支持版本历史
- **chapter_versions** - 章节版本历史
- **tracking_records** - 角色状态、伏笔、时间线追踪
- **generation_tasks** - AI 生成任务状态

### Milvus 集合
- **chapter_embeddings** - 章节内容向量，用于相关章节检索
- **setting_embeddings** - 设定内容向量 (世界观、角色、物品等)

## 环境变量

后端需要 `.env` 文件 (从 `backend/.env.example` 复制):
```
DATABASE_URL=mysql+aiomysql://user:pass@localhost:3306/novel_db
REDIS_URL=redis://localhost:6379
MILVUS_HOST=localhost
MILVUS_PORT=19530
SECRET_KEY=your-secret-key
OPENAI_API_KEY=sk-...
```

## 核心模式

1. **全异步后端** - 所有数据库操作使用 SQLAlchemy 异步模式
2. **依赖注入** - `get_db()` 向 routers 提供异步会话
3. **生命周期管理** - 数据库/Redis/Milvus 连接在 `main.py:lifespan` 中管理
4. **JWT 认证** - Token 通过 `Authorization: Bearer <token>` 头传递
5. **JSON 字段** - 灵活配置使用 JSON 类型存储 (MySQL 8.0+)

## API 规范

- 基础路径：`/api`
- 用户端点：`/api/users/*`, `/api/auth/*`
- 项目端点：`/api/projects/*`
- 响应格式：通过 axios 拦截器统一处理

## 向量嵌入

- 维度：1536 (OpenAI) 或 4096 (本地模型)
- 相似度：COSINE
- 索引：IVF_FLAT, nlist=1024

## 环境说明

- 开发环境：WSL2
- Python 环境：Miniconda3 (路径 `/mnt/d/code/tool/data/miniconda3/envs/`)
- 前端：Node.js + npm

## 前端路由配置

| 路径 | 组件 | 参数 |
|------|------|------|
| `/login` | Login | - |
| `/` | Dashboard | - |
| `/project/:id` | ProjectDetail | id: 项目 UUID |
| `/editor/:projectId/:chapterId` | Editor | projectId, chapterId (或 `new`) |

**注意**：新建章节使用 `/editor/{projectId}/new`，不是 `/project/{id}/editor`
