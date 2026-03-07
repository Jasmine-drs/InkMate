# InkMate - AI 单元剧小说创作助手

<div align="center">

一款**人机协作**的 AI 小说创作工具，以**单元剧小说**为核心场景

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18-61dafb.svg?logo=react)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6.svg?logo=typescript)](https://www.typescriptlang.org/)

</div>

---

## 项目简介

InkMate 是一款专注于**单元剧小说**创作的 AI 辅助工具。与传统"一键生成整本"的全自动模式不同，本项目强调**章节级生成**与**人工主导**的创作流程，让 AI 成为创作者的得力助手而非替代者。

### 核心理念

- **人机协作** - 作者主导创作方向，AI 提供内容生成与润色
- **逐章推进** - 精细化控制每个章节的质量
- **单元剧专业化** - 针对单元剧结构提供专门的工作流支持

### 核心差异

| 维度 | 传统 AI 小说工具 | InkMate |
|------|-----------------|---------|
| 生成模式 | 全自动批量生成 | 逐章节、人主导 |
| 用户角色 | 旁观者/校对者 | 创作者/导演 |
| 前端形态 | 桌面 GUI | 现代 Web 应用 |
| 特色场景 | 通用小说 | 单元剧优先 |
| 编辑能力 | 有限 | 富文本编辑器 + AI 操作 |

---

## 技术栈

### 前端
- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **UI 组件库**: Ant Design 5.x
- **状态管理**: Zustand + TanStack Query
- **HTTP 客户端**: Axios
- **路由**: React Router v6

### 后端
- **框架**: FastAPI (Python 3.12+)
- **ORM**: SQLAlchemy (async)
- **数据库**: MySQL 8.0+ (aiomysql)
- **向量数据库**: Milvus 2.x
- **缓存**: Redis
- **认证**: JWT (python-jose) + bcrypt

### 基础设施
- **容器化**: Docker + Docker Compose
- **对象存储**: MinIO (S3 兼容)
- **服务发现**: etcd

---

## 快速开始

### 环境要求

- Node.js 18+
- Python 3.12+
- Docker 20+
- MySQL 8.0+
- Milvus 2.x

### 1. 克隆项目

```bash
git clone https://github.com/Jasmine-drs/InkMate.git
cd InkMate
```

### 2. 启动基础设施 (Docker)

```bash
# 启动 Milvus, MinIO, etcd
docker-compose up -d
```

### 3. 后端配置

```bash
cd backend
cp .env.example .env
# 编辑 .env 文件配置数据库连接和 API 密钥
```

### 4. 前端配置

```bash
cd frontend
cp .env.example .env
# 编辑 .env 文件配置 API 地址
```

### 5. 开发模式运行

**后端:**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**前端:**
```bash
cd frontend
npm install
npm run dev
```

访问 http://localhost:3000 开始使用

---

## 项目进度

### 路线图

```
┌─────────────────────────────────────────────────────────────┐
│  阶段              状态        预计完成    进度             │
├─────────────────────────────────────────────────────────────┤
│  第一阶段：基础框架   ✅ 已完成   2026-02-28   ████████████  │
│  第二阶段：核心编辑   ✅ 已完成   2026-03-28   ████████████  │
│  第三阶段：设定系统   ✅ 已完成   2026-04-18   ████████████  │
│  第四阶段：单元剧     ✅ 已完成   2026-05-09   ████████████  │
│  第五阶段：AI 增强    🔄 收尾中   2026-05-30   ████████░░░░  │
│  第六阶段：优化完善   🔄 收尾中   2026-06-13   ██████░░░░░░  │
└─────────────────────────────────────────────────────────────┘
```

### 最新版本动态

#### v0.5.1 (2026-03-07) - 审计收口中
**阶段**: 第五 / 第六阶段收尾

- ✅ 第三阶段设定系统与第四阶段单元剧支持已完成
- ✅ 单项目导出、AI 对话基础流式、追踪手动提取链路已上线
- ⏳ 待补齐编辑器高级 AI 操作、AI 对话上下文与历史联动、章节定稿自动追踪、批量导出/导出历史/数据导入、ESLint/冒烟测试

#### v0.3.0 (2026-03-01) - 已完成
**阶段**: 第二阶段 - 核心编辑 ✅

- ✅ 项目初始化完成
- ✅ 数据库设计与迁移
- ✅ 用户认证系统
- ✅ 基础 CRUD API (项目/单元/角色/大纲/章节)
- ✅ 前端项目框架搭建
- ✅ TipTap 编辑器集成
- ✅ 章节编辑页面
- ✅ 自动保存与版本管理
- ✅ AI 生成接口 (OpenAI 集成)
- ✅ 流式输出前端展示
- ✅ 版本历史对比与回滚

#### v0.2.0 (2026-03-01) - 已完成
**阶段**: 第二阶段 - 核心编辑

#### v0.1.0 (2026-02-28) - 已完成
**阶段**: 第一阶段 - 基础框架

- ✅ 前后端脚手架初始化
- ✅ 用户认证（注册/登录）
- ✅ 项目管理 CRUD
- ✅ 章节管理 CRUD + 版本历史
- ✅ 单元管理 CRUD
- ✅ 角色管理 CRUD
- ✅ 大纲管理 CRUD

---

## 核心功能

### 已实现

- [x] 用户认证系统 (JWT)
- [x] 项目 / 章节 / 单元 / 角色 / 大纲管理
- [x] 设定工坊 (世界观 / 角色 / 大纲)
- [x] 状态追踪 (手动维护 + 手动 AI 提取)
- [x] 富文本编辑器 (TipTap)
- [x] 自动保存功能
- [x] AI 续写 / 改写 / 扩写
- [x] AI 对话助手（基础流式）
- [x] 上下文智能检索
- [x] 导出功能（单项目 TXT / EPUB / DOCX）

### 待收尾

- [ ] 编辑器高级 AI 操作（缩写 / 润色 / 询问 / 选区一致性检查）
- [ ] 章节批注系统
- [ ] AI 对话上下文与历史联动
- [ ] 章节定稿自动触发追踪更新
- [ ] 批量导出 / 导出历史 / 数据导入
- [ ] ESLint 恢复与冒烟测试

---

## 项目结构

```
InkMate/
├── backend/                 # 后端服务
│   ├── main.py             # FastAPI 入口
│   ├── routers/            # API 路由
│   ├── models/             # 数据模型
│   ├── schemas/            # 请求/响应 Schema
│   ├── services/           # 业务逻辑
│   ├── utils/              # 工具函数
│   └── db/                 # 数据库配置
├── frontend/               # 前端应用
│   ├── src/
│   │   ├── pages/         # 页面组件
│   │   ├── components/    # 通用组件
│   │   ├── router/        # 路由配置
│   │   ├── services/      # API 服务
│   │   ├── store/         # 状态管理
│   │   └── utils/         # 工具函数
│   └── public/
├── docs/                   # 项目文档
│   ├── PLAN.md            # 路线图
│   ├── TASKS.md           # 任务清单
│   ├── RISKS.md           # 风险台账
│   └── METRICS.md         # 质量指标
├── scripts/                # 脚本工具
│   ├── init_mysql.sql     # 数据库初始化
│   ├── init_milvus.py     # Milvus 初始化
│   └── fix_users_table.sql
├── docker-compose.yml      # Docker 编排
└── volumes/                # 数据卷
```

---

## API 端点

### 认证
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录

### 项目
- `GET /api/projects` - 获取项目列表
- `POST /api/projects` - 创建项目
- `GET /api/projects/{id}` - 获取项目详情
- `PUT /api/projects/{id}` - 更新项目
- `DELETE /api/projects/{id}` - 删除项目

### 单元 (单元剧专用)
- `GET /api/projects/{id}/units` - 获取单元列表
- `POST /api/projects/{id}/units` - 创建单元
- `GET /api/projects/{id}/units/{uid}` - 获取单元详情
- `PUT /api/projects/{id}/units/{uid}` - 更新单元
- `DELETE /api/projects/{id}/units/{uid}` - 删除单元

### 章节
- `GET /api/projects/{id}/chapters` - 获取章节列表
- `POST /api/projects/{id}/chapters` - 创建章节
- `GET /api/projects/{id}/chapters/{num}` - 获取章节内容
- `PUT /api/projects/{id}/chapters/{id}` - 更新章节
- `GET /api/projects/{id}/chapters/{id}/versions` - 获取版本历史

### AI 生成
- `POST /api/ai/generate` - 通用文本生成
- `POST /api/ai/generate/chapter` - 生成章节内容
- `POST /api/ai/continue` - AI 续写
- `POST /api/ai/rewrite` - AI 改写
- `POST /api/ai/expand` - AI 扩写

> 完整 API 文档请访问 `/docs` (Swagger UI)

---

## 开发指南

### 后端开发

```bash
cd backend
source /path/to/venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### 前端开发

```bash
cd frontend
npm install
npm run dev
```

### 数据库初始化

```bash
# 执行 SQL 脚本
mysql -u root -p < scripts/init_mysql.sql

# 或使用 Python 脚本初始化 Milvus
python scripts/init_milvus.py
```

---

## 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

---

## 联系方式

- **作者**: Jasmine-drs
- **GitHub**: [@Jasmine-drs](https://github.com/Jasmine-drs)
- **Issue 反馈**: [GitHub Issues](https://github.com/Jasmine-drs/InkMate/issues)

---

<div align="center">

**InkMate** - 让人机协作更自然，让创作更自由

[返回顶部](#inkmate---ai 单元剧小说创作助手)

</div>
