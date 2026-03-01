# AI单元剧小说创作助手 - 项目计划

## 一、项目概述

### 1.1 项目定位
一款**人机协作**的AI小说创作工具，以**单元剧小说**为核心场景，同时支持通用类型小说创作。与传统的"一键生成整本"模式不同，本项目强调**章节级生成**与**人工主导**的创作流程。

### 1.2 核心差异点

| 维度 | 传统AI小说工具 | 本项目 |
|------|---------------|--------|
| 生成模式 | 全自动批量生成 | 逐章节、人主导 |
| 用户角色 | 旁观者/校对者 | 创作者/导演 |
| 前端形态 | 桌面GUI | 现代Web应用 |
| 特色场景 | 通用小说 | 单元剧优先 |
| 编辑能力 | 有限 | 富文本编辑器 |

### 1.3 目标用户
- 单元剧/单元故事创作者（侦探推理、都市传说、奇幻冒险等）
- 需要AI辅助但保持创作主导权的作者
- 希望逐步构建世界观的长期连载作者

---

## 二、系统架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      前端 (Web Application)                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────┐│
│  │ 项目管理    │ │ 章节编辑器  │ │ 设定工坊    │ │ AI助手 ││
│  │ Dashboard   │ │ Editor      │ │ World-Build │ │ Chat   ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      后端 (API Server)                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │ 项目服务    │ │ 生成服务    │ │ 检索服务    │            │
│  │ ProjectSvc  │ │ GenerateSvc │ │ RetrieveSvc │            │
│  └─────────────┘ └─────────────┘ └─────────────┘            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │ 设定服务    │ │ AI对话服务  │ │ 导出服务    │            │
│  │ SettingSvc  │ │ ChatSvc     │ │ ExportSvc   │            │
│  └─────────────┘ └─────────────┘ └─────────────┘            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        数据层                                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │ MySQL	  	│  │ Milvus		│ │ 文件存储   │            │
│  │ 关系数据    │ │ 向量数据库   │ │ Local/OSS  │            │
│  └─────────────┘ └─────────────┘ └─────────────┘            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      外部服务                                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │ OpenAI API  │ │ DeepSeek    │ │ Ollama本地  │            │
│  │ Claude API  │ │ 智谱/通义   │ │ 其他LLM     │            │
│  └─────────────┘ └─────────────┘ └─────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 技术栈选型

| 层级 | 技术选择 | 理由 |
|------|---------|------|
| 前端框架 | React 18 + TypeScript | 生态成熟，组件丰富 |
| UI组件库 | Ant Design / Shadcn UI | 企业级UI，支持暗色主题 |
| 编辑器 | TipTap (ProseMirror) | 现代富文本，扩展性强 |
| 状态管理 | Zustand + TanStack Query | 轻量+服务端状态管理 |
| 后端框架 | FastAPI (Python) | AI生态友好，异步支持 |
| 数据库 | MySQL 8.0+ | 关系数据，成熟稳定，社区活跃 |
| 向量库 | Milvus | 高性能分布式向量检索，支持海量数据 |
| 缓存 | Redis | 会话管理，任务队列 |

---

## 三、核心功能模块

### 3.1 项目与设定管理

#### 3.1.1 小说项目结构

```
项目 (Project)
├── 基本信息（标题、类型、简介、标签）
├── 全局设定
│   ├── 世界观设定
│   ├── 魔法/科技体系
│   ├── 势力/组织架构
│   └── 专有名词词典
├── 角色卡 (Characters)
│   ├── 主角团
│   ├── 配角群
│   └── 单元角色（单元剧专用）
├── 大纲系统
│   ├── 主线大纲（长篇主线）
│   ├── 单元大纲（单元剧专用）
│   └── 章节细纲
└── 章节内容 (Chapters)
    ├── 章节元数据
    ├── 正文内容
    ├── 版本历史
    └── AI对话记录
```

#### 3.1.2 单元剧特殊设计

**单元概念模型：**

```
单元 (Unit/Episode)
├── 单元编号与标题
├── 单元类型（独立案件 / 主线关联 / 过渡篇章）
├── 章节范围（第X-Y章）
├── 单元角色
│   ├── 本单元专属角色
│   └── 客串角色设定
├── 单元设定
│   ├── 案件/事件背景
│   ├── 地点场景
│   └── 线索与伏笔
├── 单元大纲
│   ├── 开篇钩子
│   ├── 核心冲突
│   ├── 转折点
│   └── 结局收束
└── 与主线的关联
    ├── 推进的主线信息
    └── 角色成长点
```

### 3.2 智能生成系统

#### 3.2.1 生成流程设计

```
用户请求生成章节
        │
        ▼
┌───────────────────┐
│ 1. 上下文收集     │
│   - 全局设定      │
│   - 角色状态      │
│   - 相关章节摘要  │
│   - 当前单元信息  │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ 2. 上下文压缩     │
│   - 向量检索相关  │
│   - 智能摘要压缩  │
│   - Token预算分配 │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ 3. 多阶段生成     │
│   Stage1: 场景规划│
│   Stage2: 详细大纲│
│   Stage3: 正文生成│
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ 4. 返回编辑器     │
│   - 流式输出      │
│   - 实时渲染      │
└───────────────────┘
```

#### 3.2.2 上下文窗口管理策略

**Token预算分配示例（以8K上下文为例）：**

```
总预算: 8000 tokens
├── 系统提示词: 500 tokens
├── 世界观设定摘要: 800 tokens
├── 相关角色卡: 1000 tokens
├── 前情提要（自动摘要）: 1500 tokens
├── 当前单元信息: 1200 tokens
├── 本章细纲/指导: 1000 tokens
└── 预留生成空间: 2000 tokens
```

**智能检索策略：**

- 基于向量相似度检索相关历史章节
- 角色提及追踪（自动识别章节中出现的角色）
- 伏笔状态追踪（已埋设/已回收/待回收）

#### 3.2.3 单元剧生成增强

**单元上下文隔离：**
- 每个单元维护独立的角色池和设定
- 自动识别"常驻角色"vs"单元角色"
- 单元间伏笔关联提示

**单元模板系统：**
```json
{
  "unit_template": "detective_case",
  "structure": {
    "opening": "案件引入（1章）",
    "investigation": "调查展开（2-3章）",
    "climax": "真相揭露（1章）",
    "resolution": "收尾与伏笔（0.5章）"
  },
  "required_elements": [
    "案件背景", "嫌疑人", "线索链", "红鲱鱼", "真相反转"
  ]
}
```

### 3.3 富文本编辑器

#### 3.3.1 编辑器核心功能

- **基础格式**：标题层级、加粗斜体、引用、列表
- **小说专用**：分隔符、场景切换标记、对话高亮
- **AI协作**：选中文本召唤AI、续写、改写、扩写
- **批注系统**：自建批注、AI建议批注
- **版本管理**：自动保存、版本对比、回滚

#### 3.3.2 AI辅助编辑功能

| 功能 | 触发方式 | 说明 |
|------|---------|------|
| 续写 | 光标定位后点击 | 从当前位置继续生成 |
| 改写 | 选中文本 | 保持语义重写风格 |
| 扩写 | 选中文本 | 增加细节描写 |
| 缩写 | 选中文本 | 精简冗余内容 |
| 润色 | 选中文本 | 优化语言表达 |
| 询问 | 选中文本 | 针对内容提问AI |
| 一致性检查 | 选中文本 | 检查设定冲突 |

### 3.4 AI对话助手

#### 3.4.1 对话场景

1. **创作咨询**：讨论剧情走向、角色塑造
2. **设定查询**："某角色的性格特点是什么？"
3. **灵感激发**：提供剧情建议、桥段参考
4. **问题诊断**：分析卡文原因、提供突破思路

#### 3.4.2 上下文感知

AI助手能够访问：
- 当前项目的所有设定
- 当前编辑的章节内容
- 历史对话记录
- 用户偏好设置

### 3.5 设定工坊

#### 3.5.1 设定生成与维护

**AI辅助设定生成：**
- 根据小说主题自动生成世界观框架
- 根据角色定位生成角色卡模板
- 根据大纲自动拆解章节细纲

**设定一致性检查：**

- 角色能力是否符合世界观
- 时间线是否合理
- 地理设定是否自洽

#### 3.5.2 角色卡系统

```
角色卡 (Character Card)
├── 基本信息
│   ├── 姓名、别名、称号
│   ├── 年龄、性别、外貌
│   └── 身份、职业、阵营
├── 性格特征
│   ├── 核心性格（3-5个关键词）
│   ├── 说话方式/口癖
│   └── 行为习惯
├── 背景故事
├── 能力/技能
├── 人际关系图
├── 角色弧光规划
│   ├── 初始状态
│   ├── 成长转折点
│   └── 目标状态
└── 出场记录
    ├── 出场章节列表
    └── 状态变化记录
```

### 3.6 状态追踪系统

#### 3.6.1 追踪内容

| 追踪类型 | 说明 | 示例 |
|---------|------|------|
| 角色状态 | 位置、情绪、关系变化 | "主角目前位于A城，与B关系恶化" |
| 伏笔管理 | 埋设、回收、关联 | "第3章埋设的神秘人身份待揭露" |
| 物品追踪 | 重要物品位置和状态 | "关键证物目前在警方证物室" |
| 时间线 | 事件发生的时间顺序 | 自动生成故事时间线 |
| 单元进度 | 单元剧各单元完成状态 | "第1单元已完成，第2单元进行中" |

#### 3.6.2 自动更新机制

- **章节定稿时**：自动提取并更新状态
- **AI生成时**：读取最新状态作为上下文
- **手动修正**：用户可手动调整追踪状态

---

## 四、前端页面设计

### 4.1 页面结构

```
App
├── 登录/注册页
├── 主工作台
│   ├── 侧边导航
│   │   ├── 项目列表
│   │   ├── 设定入口
│   │   ├── 角色管理
│   │   ├── 大纲管理
│   │   └── 单元管理（单元剧模式）
│   ├── 内容区域
│   │   ├── 仪表盘（项目概览）
│   │   ├── 章节编辑器
│   │   ├── 设定编辑页
│   │   ├── 角色卡编辑页
│   │   ├── 大纲编辑页
│   │   └── 单元管理页
│   └── 右侧面板（可收起）
│       ├── AI助手对话
│       ├── 章节信息
│       └── 快速设定
└── 设置页
    ├── AI模型配置
    ├── 外观设置
    └── 导出设置
```

### 4.2 核心页面设计

#### 4.2.1 章节编辑器

```
┌─────────────────────────────────────────────────────────────┐
│ 章节标题: [第1章 迷雾中的少女              ] [保存] [导出] │
├─────────────────────────────────────────────────────────────┤
│ 工具栏: [H1][H2][B][I][引用][分隔] [AI续写][AI改写][检查]  │
├───────────────────────────────┬─────────────────────────────┤
│                               │ 侧边信息面板                │
│                               │ ┌─────────────────────────┐ │
│      章节正文编辑区           │ │ 📖 本章信息             │ │
│                               │ │ 所属单元: 第1单元       │ │
│      （TipTap富文本）         │ │ 字数: 3,241             │ │
│                               │ │ 状态: 草稿              │ │
│      支持选中文字后           │ └─────────────────────────┘ │
│      弹出AI操作菜单           │ ┌─────────────────────────┐ │
│                               │ │ 👥 本章角色             │ │
│                               │ │ [主角] [配角A] [+添加]  │ │
│                               │ └─────────────────────────┘ │
│                               │ ┌─────────────────────────┐ │
│                               │ │ 📝 本章细纲             │ │
│                               │ │ (可编辑的大纲要点)      │ │
│                               │ └─────────────────────────┘ │
│                               │ ┌─────────────────────────┐ │
│                               │ │ 🎯 生成指导             │ │
│                               │ │ [输入本章写作要求...]   │ │
│                               │ │ [生成本章内容]          │ │
│                               │ └─────────────────────────┘ │
└───────────────────────────────┴─────────────────────────────┘
```

#### 4.2.2 单元管理页（单元剧专用）

```
┌─────────────────────────────────────────────────────────────┐
│ 单元剧管理                                    [+新建单元]   │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📦 第1单元: 迷雾山庄杀人事件                             │ │
│ │ 章节: 1-5  |  状态: 已完成  |  类型: 独立案件            │ │
│ │ 角色: 侦探A, 助手B, 嫌疑人CDE...                        │ │
│ │ [查看详情] [编辑] [生成新单元]                           │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📦 第2单元: 消失的画作                                   │ │
│ │ 章节: 6-10  |  状态: 进行中  |  类型: 主线关联           │ │
│ │ 角色: 侦探A, 助手B, 画廊老板F...                        │ │
│ │ [查看详情] [编辑] [继续创作]                             │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📦 第3单元: 待规划                                       │ │
│ │ 章节: 11-?  |  状态: 未开始  |  类型: 待定               │ │
│ │ [规划单元]                                               │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 交互设计要点

1. **实时保存**：编辑内容自动保存到本地缓存，定时同步到服务器
2. **快捷键支持**：Ctrl+Enter 生成续写，Ctrl+S 保存等
3. **AI操作浮层**：选中文本后浮现AI操作按钮
4. **流式生成**：AI生成内容实时流式显示，可随时停止
5. **对比视图**：AI改写后可对比原文/新文选择保留

---

## 五、后端API设计

### 5.1 核心API列表

#### 项目管理
```
POST   /api/projects                    创建项目
GET    /api/projects                    获取项目列表
GET    /api/projects/{id}               获取项目详情
PUT    /api/projects/{id}               更新项目信息
DELETE /api/projects/{id}               删除项目
```

#### 设定管理
```
GET    /api/projects/{id}/settings      获取项目设定
PUT    /api/projects/{id}/settings      更新项目设定
POST   /api/projects/{id}/settings/generate   AI生成设定
```

#### 角色管理
```
GET    /api/projects/{id}/characters    获取角色列表
POST   /api/projects/{id}/characters    创建角色
PUT    /api/projects/{id}/characters/{cid}  更新角色
DELETE /api/projects/{id}/characters/{cid}  删除角色
POST   /api/projects/{id}/characters/{cid}/generate  AI生成角色卡
```

#### 大纲管理
```
GET    /api/projects/{id}/outline       获取大纲
PUT    /api/projects/{id}/outline       更新大纲
POST   /api/projects/{id}/outline/generate    AI生成大纲
POST   /api/projects/{id}/outline/breakdown   拆解章节细纲
```

#### 单元管理（单元剧专用）
```
GET    /api/projects/{id}/units         获取单元列表
POST   /api/projects/{id}/units         创建单元
GET    /api/projects/{id}/units/{uid}   获取单元详情
PUT    /api/projects/{id}/units/{uid}   更新单元
DELETE /api/projects/{id}/units/{uid}   删除单元
POST   /api/projects/{id}/units/{uid}/generate  生成单元内容
```

#### 章节管理
```
GET    /api/projects/{id}/chapters      获取章节列表
POST   /api/projects/{id}/chapters      创建章节
GET    /api/projects/{id}/chapters/{num}  获取章节内容
PUT    /api/projects/{id}/chapters/{num}  保存章节内容
DELETE /api/projects/{id}/chapters/{num}  删除章节
GET    /api/projects/{id}/chapters/{num}/versions  获取版本历史
```

#### 生成相关
```
POST   /api/generate/chapter            生成章节内容（流式）
POST   /api/generate/continue           续写内容（流式）
POST   /api/generate/rewrite            改写内容（流式）
POST   /api/generate/expand             扩写内容（流式）
POST   /api/generate/outline            生成大纲（流式）
POST   /api/generate/character          生成角色卡（流式）
```

#### AI对话
```
POST   /api/chat                        AI对话（流式）
GET    /api/chat/history                获取对话历史
```

#### 状态追踪
```
GET    /api/projects/{id}/tracking      获取追踪状态
PUT    /api/projects/{id}/tracking      更新追踪状态
POST   /api/projects/{id}/tracking/extract  从章节提取状态更新
```

### 5.2 流式响应设计

生成类API使用SSE（Server-Sent Events）实现流式输出：

```
POST /api/generate/chapter
Request:
{
  "project_id": "xxx",
  "chapter_num": 1,
  "guidance": "本章需要引入神秘角色，埋下伏笔",
  "stream": true
}

Response (SSE):
data: {"type": "start", "chapter_num": 1}
data: {"type": "content", "text": "夜幕低垂，"}
data: {"type": "content", "text": "迷雾笼罩着古老的庄园..."}
data: {"type": "content", "text": "\n\n"}
data: {"type": "done", "total_tokens": 2341}
```

---

## 六、数据模型设计

### 6.1 核心表结构

```sql
-- 项目表
CREATE TABLE projects (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    title VARCHAR(200) NOT NULL,
    genre VARCHAR(50),
    type VARCHAR(20) DEFAULT 'novel',  -- novel, unit_drama
    description TEXT,
    settings JSON,  -- 世界观设定
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 角色表
CREATE TABLE characters (
    id CHAR(36) PRIMARY KEY,
    project_id CHAR(36),
    name VARCHAR(100) NOT NULL,
    role_type VARCHAR(20),  -- protagonist, supporting, unit_character
    card_data JSON,  -- 完整角色卡数据
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    INDEX idx_project_id (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 单元表（单元剧专用）
CREATE TABLE units (
    id CHAR(36) PRIMARY KEY,
    project_id CHAR(36),
    unit_number INT NOT NULL,
    title VARCHAR(200),
    unit_type VARCHAR(50),  -- standalone, mainline_related, transition
    start_chapter INT,
    end_chapter INT,
    settings JSON,  -- 单元专属设定
    outline JSON,   -- 单元大纲
    status VARCHAR(20) DEFAULT 'planning',  -- planning, in_progress, completed
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    INDEX idx_project_id (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 大纲表
CREATE TABLE outlines (
    id CHAR(36) PRIMARY KEY,
    project_id CHAR(36),
    outline_type VARCHAR(20),  -- main, unit, chapter
    parent_id CHAR(36),  -- 父级大纲ID（章节细纲属于单元大纲等）
    chapter_number INT,  -- 如果是章节细纲
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    INDEX idx_project_id (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 章节表
CREATE TABLE chapters (
    id CHAR(36) PRIMARY KEY,
    project_id CHAR(36),
    unit_id CHAR(36),
    chapter_number INT NOT NULL,
    title VARCHAR(200),
    content LONGTEXT,
    word_count INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft',  -- draft, finalized
    chapter_guidance TEXT,  -- 本章写作指导
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL,
    INDEX idx_project_id (project_id),
    INDEX idx_unit_id (unit_id),
    UNIQUE KEY uk_project_chapter (project_id, chapter_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 章节版本表
CREATE TABLE chapter_versions (
    id CHAR(36) PRIMARY KEY,
    chapter_id CHAR(36),
    version_number INT,
    content LONGTEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
    INDEX idx_chapter_id (chapter_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 状态追踪表
CREATE TABLE tracking_records (
    id CHAR(36) PRIMARY KEY,
    project_id CHAR(36),
    tracking_type VARCHAR(50),  -- character_state, foreshadowing, item, timeline
    entity_id CHAR(36),  -- 关联的实体ID（角色/物品等）
    chapter_number INT,  -- 记录来源章节
    state_data JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    INDEX idx_project_id (project_id),
    INDEX idx_tracking_type (tracking_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- AI对话记录表
CREATE TABLE chat_messages (
    id CHAR(36) PRIMARY KEY,
    project_id CHAR(36),
    chapter_id CHAR(36),  -- 可选，关联章节
    role VARCHAR(20),  -- user, assistant
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    INDEX idx_project_id (project_id),
    INDEX idx_chapter_id (chapter_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 6.2 向量数据库设计

使用Milvus存储向量数据：

```python
from pymilvus import Collection, FieldSchema, CollectionSchema, DataType

# 章节内容向量集合
chapter_fields = [
    FieldSchema(name="id", dtype=DataType.INT64, is_primary=True, auto_id=True),
    FieldSchema(name="project_id", dtype=DataType.VARCHAR, max_length=36),
    FieldSchema(name="chapter_number", dtype=DataType.INT64),
    FieldSchema(name="unit_id", dtype=DataType.VARCHAR, max_length=36),
    FieldSchema(name="content", dtype=DataType.VARCHAR, max_length=65535),
    FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=1536),  # OpenAI embedding维度
]
chapter_schema = CollectionSchema(fields=chapter_fields, description="章节内容向量")
chapter_collection = Collection(name="chapter_embeddings", schema=chapter_schema)

# 设定向量集合
setting_fields = [
    FieldSchema(name="id", dtype=DataType.INT64, is_primary=True, auto_id=True),
    FieldSchema(name="project_id", dtype=DataType.VARCHAR, max_length=36),
    FieldSchema(name="setting_type", dtype=DataType.VARCHAR, max_length=50),  # worldview, character, item
    FieldSchema(name="content", dtype=DataType.VARCHAR, max_length=65535),
    FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=1536),
]
setting_schema = CollectionSchema(fields=setting_fields, description="设定内容向量")
setting_collection = Collection(name="setting_embeddings", schema=setting_schema)

# 创建索引（使用IVF_FLAT）
index_params = {
    "metric_type": "COSINE",
    "index_type": "IVF_FLAT",
    "params": {"nlist": 1024}
}
chapter_collection.create_index(field_name="embedding", index_params=index_params)
setting_collection.create_index(field_name="embedding", index_params=index_params)
```

---

## 七、开发计划

### 7.1 阶段划分

#### 第一阶段：基础框架（2-3周）
- [ ] 项目初始化（前后端脚手架）
- [ ] 数据库设计与迁移
- [ ] 用户认证系统
- [ ] 基础CRUD API
- [ ] 前端项目/章节列表页

#### 第二阶段：核心编辑（3-4周）
- [ ] TipTap编辑器集成
- [ ] 章节编辑页面
- [ ] 自动保存与版本管理
- [ ] 基础AI生成接口（单次生成）
- [ ] 流式输出前端展示

#### 第三阶段：设定系统（2-3周）
- [ ] 世界观设定编辑
- [ ] 角色卡管理
- [ ] 大纲编辑器
- [ ] AI辅助设定生成
- [ ] 设定与生成联动

#### 第四阶段：单元剧支持（2-3周）
- [ ] 单元管理功能
- [ ] 单元上下文隔离
- [ ] 单元模板系统
- [ ] 单元进度追踪

#### 第五阶段：AI增强（2-3周）
- [ ] 编辑器内AI操作（续写/改写/扩写）
- [ ] AI对话助手
- [ ] 上下文智能检索
- [ ] 一致性检查

#### 第六阶段：优化与完善（2周）
- [ ] 性能优化
- [ ] 导出功能（TXT/EPUB/DOCX）
- [ ] 数据导入导出
- [ ] 用户体验优化

### 7.2 技术风险与应对

| 风险 | 影响 | 应对策略 |
|------|------|---------|
| LLM API不稳定 | 生成失败率高 | 多模型后备、重试机制、本地模型支持 |
| 上下文窗口限制 | 长篇小说连贯性差 | 智能摘要、向量检索、分层上下文 |
| 流式输出中断 | 用户体验差 | 断点续传、本地缓存、错误恢复 |
| 向量检索精度 | 召回内容不相关 | 多路召回、重排序、用户反馈优化 |

---

## 八、部署方案

### 8.1 开发环境

```yaml
# docker-compose.dev.yml
services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
    environment:
      - API_URL=http://backend:8000

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app
    environment:
      - DATABASE_URL=mysql+aiomysql://user:pass@db:3306/novel_db
      - REDIS_URL=redis://redis:6379
      - MILVUS_HOST=milvus-standalone
      - MILVUS_PORT=19530
    depends_on:
      - db
      - redis
      - milvus-standalone

  db:
    image: mysql:8.0
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    environment:
      - MYSQL_ROOT_PASSWORD=rootpass
      - MYSQL_DATABASE=novel_db
      - MYSQL_USER=user
      - MYSQL_PASSWORD=pass
    command: --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  # Milvus 向量数据库
  etcd:
    image: quay.io/coreos/etcd:v3.5.5
    environment:
      - ETCD_AUTO_COMPACTION_MODE=revision
      - ETCD_AUTO_COMPACTION_RETENTION=1000
      - ETCD_QUOTA_BACKEND_BYTES=4294967296
    volumes:
      - etcd_data:/etcd
    command: etcd -advertise-client-urls=http://127.0.0.1:2379 -listen-client-urls http://0.0.0.0:2379 --data-dir /etcd

  minio:
    image: minio/minio:RELEASE2023-03-20T20-16-18Z
    environment:
      MINIO_ACCESS_KEY: minioadmin
      MINIO_SECRET_KEY: minioadmin
    volumes:
      - minio_data:/minio_data
    command: minio server /minio_data

  milvus-standalone:
    image: milvusdb/milvus:v2.3.3
    ports:
      - "19530:19530"
      - "9091:9091"
    environment:
      ETCD_ENDPOINTS: etcd:2379
      MINIO_ADDRESS: minio:9000
    volumes:
      - milvus_data:/var/lib/milvus
    command: ["milvus", "run", "standalone"]
    depends_on:
      - etcd
      - minio

volumes:
  mysql_data:
  redis_data:
  etcd_data:
  minio_data:
  milvus_data:
```

### 8.2 生产部署

- **前端**：Vercel / Netlify / 阿里云OSS+CDN
- **后端**：Docker容器 + 云服务器（阿里云/腾讯云）
- **数据库**：云数据库MySQL（RDS）
- **向量库**：Milvus集群 / Zilliz Cloud（Milvus托管服务）
- **缓存**：云Redis服务

---

## 九、后续扩展方向

1. **多语言支持**：界面国际化
2. **协作功能**：多人协作创作
3. **社区功能**：作品分享、评论
4. **移动端**：响应式设计或独立APP
5. **本地模型**：更好的Ollama集成本地推理
6. **语音输入**：语音转文字辅助创作
7. **AI朗读**：TTS朗读校对

---

## 十、总结

本项目的核心理念是**"人机协作、逐章推进"**，让AI成为创作者的得力助手而非替代者。通过针对单元剧的特殊优化，为这一类型小说的创作提供更专业的支持。技术上采用现代化的Web架构，确保系统的可维护性和扩展性。

**关键成功因素：**
1. 上下文管理的智能化程度
2. 编辑器体验的流畅度
3. AI生成内容的质量与可控性
4. 单元剧工作流的易用性
