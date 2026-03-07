# InkMate 前后端功能缺口审计报告

**审计日期**: 2026-03-07
**审计范围**: `frontend/src/*`、`backend/routers/*`、`backend/services/*`、`backend/models/*`
**审计方式**: 静态代码检查 + 页面/接口调用链核对 + 基础构建验证

---

## 1. 结论摘要

项目已经具备“可演示”的基础框架，但距离“功能闭环完整可用”还有明显差距。

- 前端页面数量不少，但多个页面入口仍是占位实现，尤其集中在项目详情页和编辑器侧边栏。
- 后端接口覆盖面比前端更广，存在“后端已写、前端没接”的情况，也存在“前端已接、后端实际会报错”的情况。
- 文档状态明显高估了完成度，`docs/PLAN.md` 和 `docs/TASKS.md` 中多项“已完成”与代码现状不符。

综合判断：

- 基础 CRUD：`较完整`
- 页面功能闭环：`中等偏弱`
- AI/高级功能闭环：`明显未完成`
- 工程稳定性：`存在阻断级问题`

---

## 2. 验证结果

执行结果：

- `frontend: npm run build` -> 通过
- `frontend: npm run lint` -> 失败
- `backend: python3 -m compileall backend` -> 通过

发现：

- ESLint 配置本身不可用，报错点在 `frontend/eslint.config.js`，`typescript-eslint` 的 flat config 写法不兼容当前配置方式。
- 前端能构建，但产物体积偏大，主包约 `1.8 MB`，说明尚未做有效切分。

---

## 3. 阻断级问题（建议优先修）

### 3.1 导出按钮大概率不可用

前端调用的是 `/api/export/...`，但后端路由自身已经写成 `prefix="/api/export"`，同时又在 `main.py` 里用 `prefix="/api"` 注册，最终真实路径会变成 `/api/api/export/...`。

- 后端定义: `backend/routers/export.py:20`
- 注册位置: `backend/main.py:77-87`
- 前端调用: `frontend/src/services/export.ts`

影响：

- 项目详情页里的 TXT/EPUB/DOCX 导出按钮很可能直接 404。

### 3.2 状态追踪列表接口会在运行时报参数错误

`backend/routers/tracking.py` 调用 `TrackingService.get_project_trackings(..., page_size=page_size)`，但服务层签名参数名是 `limit`，不是 `page_size`。

- 路由调用: `backend/routers/tracking.py:99-107`
- 服务签名: `backend/services/tracking_service.py:189-195`

影响：

- 状态追踪列表页首次加载就可能 500，前端页面无法正常使用。

### 3.3 章节场景下的 AI 对话会调用错误的方法签名

聊天路由在校验章节时调用了 `chapter_service.get_chapter(request.chapter_id)`，但该方法要求 `(project_id, chapter_num)`，不是 `chapter_id`。

- 错误调用: `backend/routers/chat.py:160-165`
- 实际签名: `backend/services/chapter_service.py:31-36`

影响：

- 编辑器中打开 AI 对话，若传了 `chapterId`，接口会直接报错，章节级对话不可用。

### 3.4 项目更新存在权限校验顺序错误

`PUT /projects/{project_id}` 先执行数据库更新，再做所有权校验。

- 路由: `backend/routers/project.py:72-92`
- 服务实际提交: `backend/services/project_service.py:54-69`

影响：

- 未授权用户理论上可能先把别人的项目改掉，再收到 403 响应。这是安全问题，不只是功能问题。

---

## 4. 前端页面未闭环 / 占位功能

### 4.1 项目详情页只有“章节管理”是真实列表，其余 Tab 基本都是静态占位

`ProjectDetail.tsx` 只查询了项目信息和章节列表。角色、设定、大纲、单元、状态追踪这 5 个 Tab 没有各自的数据查询，只是统一显示“暂无 XXX”并跳转到对应页面。

- 代码位置: `frontend/src/pages/ProjectDetail.tsx:355-549`

这意味着：

- 即使项目里已经有角色/大纲/单元/追踪记录，项目详情页仍然会显示“暂无”。
- 项目详情页不是总览页，而只是章节页 + 5 个跳转卡片。

### 4.2 编辑器右侧“查看本章大纲 / 查看出场角色”未实现

编辑器侧边栏按钮目前只有提示“开发中”。

- 代码位置: `frontend/src/pages/Editor.tsx:298-312`

这属于用户可见的明显未完成项。

### 4.3 版本历史“对比当前版本”未实现

版本历史模态框里有“对比当前版本”按钮，但点击后只是提示“开发中”。

- 代码位置: `frontend/src/components/VersionHistoryModal.tsx:89-93`

当前只有“恢复版本”是真实功能，版本对比并不存在。

### 4.4 大纲编辑器的“所属主线大纲”下拉框未接数据

创建/编辑单元大纲时，`parent_id` 的选择框没有加载任何主线大纲选项，源码里保留了 TODO。

- 代码位置: `frontend/src/pages/OutlineEditor.tsx:227-235`

这会导致单元大纲无法建立父级关联。

### 4.5 编辑器宣传“选中文字可使用 AI 改写功能”，但页面没接入

工具栏只有“AI 续写”和“保存”，没有改写/扩写入口。

- 工具栏: `frontend/src/components/Toolbar.tsx:149-175`
- 文案提示: `frontend/src/pages/Editor.tsx:449-453`
- 组件存在但未被任何页面引用: `frontend/src/components/AIActionModal.tsx`

说明：

- `AIActionModal` 组件已经写了，但没有接入编辑器。
- `ai.ts` 里的 `rewrite` / `expand` 也没有真正形成页面闭环。

### 4.6 Dashboard 没有项目编辑能力

仪表盘只支持创建、进入、删除项目，没有“编辑项目基本信息”的 UI，尽管后端已经有 `updateProject` API。

- 页面实现: `frontend/src/pages/Dashboard.tsx:48-95`、`frontend/src/pages/Dashboard.tsx:296-312`

---

## 5. 前后端已存在但未接入的能力

### 5.1 大纲 AI 生成 / 章节细纲拆解仅后端存在，前端没有入口

后端已经实现：

- `/projects/{id}/outlines/generate`
- `/projects/{id}/outlines/generate/stream`
- `/projects/{id}/outlines/breakdown`
- `/projects/{id}/outlines/breakdown/stream`

但前端 `frontend/src/services/outline.ts` 只封装了 CRUD，没有对应 AI 能力。

### 5.2 状态追踪“从章节自动提取”只有后端接口，没有前端页面操作

后端存在 `/projects/{id}/tracking/extract`，前端 `tracking.ts` 也封装了 `extractTrackingFromChapters`，但页面没有任何触发入口。

说明：

- 这是典型“接口已写，功能未落地”。

### 5.3 导出历史 / 批量导出仅后端存在，前端没做

后端提供了批量导出、章节批量导出、导出历史，但当前前端只有项目详情页单项目导出按钮。

### 5.4 AI 对话历史接口未接 UI

前端服务里有 `getChatHistory`、`clearChatHistory`，后端也有对应接口，但 `AIChatModal` 没有加载历史，也没有调用服务清空服务器端记录。

---

## 6. 已接入但实现不完整的功能

### 6.1 AI 对话弹窗本身有两个实现缺陷

第一，流式完成后，助手消息很可能不会真正写入消息列表，因为 `onComplete` 闭包拿到的是旧的 `currentResponse`。

- `frontend/src/components/AIChatModal.tsx:101-117`

第二，停止生成按钮大概率无效，因为页面里的 `abortControllerRef` 从未与 `chatStream` 内部创建的 `AbortController` 建立关联。

- 页面侧引用: `frontend/src/components/AIChatModal.tsx:54-69`、`140-147`
- 服务侧单独创建 controller: `frontend/src/services/chat.ts:61-80`

### 6.2 AI 对话初始上下文被传入但未使用

编辑器把 `content/settings` 作为 `initialContext` 传给 `AIChatModal`，但组件内部用 `_initialContext` 直接丢弃了。

- 接收后忽略: `frontend/src/components/AIChatModal.tsx:40-46`

影响：

- 新建章节时，尚未保存到后端的当前内容无法进入 AI 对话上下文。

### 6.3 状态追踪 AI 提取接口后端也没真正闭环

提取阶段给每条结果加了 `project_id`，但保存时重新构造 `TrackingCreate`，这个 schema 不带 `project_id`，随后又尝试从对象上读取 `project_id`，最终会写成 `None`。

- 提取附加 `project_id`: `backend/services/tracking_service.py:98-103`
- 重新构造时丢失: `backend/services/tracking_service.py:131-137`
- 保存时再取不存在字段: `backend/services/tracking_service.py:148-158`

影响：

- 这条能力即使将来补了前端入口，当前后端也很难真正存成功。

---

## 7. 文档与实际状态不一致

当前 `docs/PLAN.md` 和 `docs/TASKS.md` 把很多功能标成“已完成”，但代码里仍然存在 TODO、占位页或未接入场景，例如：

- 版本“对比”未实现
- 编辑器内 AI 改写/扩写未接入
- AI 对话历史未接 UI
- 单元/大纲/追踪在项目详情页未真实展示
- 状态追踪自动提取未落地
- 导出能力存在路径错误

这说明项目文档现在不能作为真实完工依据，只能作为计划稿。

---

## 8. 工程质量缺口

### 8.1 缺少自动化测试

仓库中未发现 `tests/` 或前端测试目录。

影响：

- 当前很多问题只能靠手点页面发现。
- 前后端契约错位（如 chat/tracking）没有自动防护。

### 8.2 ESLint 处于不可用状态

- 文件: `frontend/eslint.config.js:8-23`

影响：

- 未使用代码、错误依赖、契约不一致等问题难以及时暴露。

### 8.3 前端体积偏大

构建产物主 JS 约 `1.8 MB`，说明编辑器、Ant Design、页面逻辑基本都进了大包。

影响：

- 首屏加载和页面切换性能一般。

---

## 9. 建议的修复优先级

### P0（先修，不然功能会坏）

1. 修复导出路由前缀，确认项目详情页导出可用。
2. 修复 tracking 列表接口的参数名错误。
3. 修复 chat 路由的章节校验调用。
4. 修复项目更新接口的权限校验顺序。
5. 修复 AI 对话弹窗的消息落库/停止生成问题。

### P1（修完才能称为“功能闭环”）

1. 让项目详情页真实展示角色/设定/大纲/单元/追踪的概览数据。
2. 实现编辑器里的“查看本章大纲”“查看出场角色”。
3. 实现版本对比视图。
4. 接入 AI 改写/扩写。
5. 补上大纲 AI 生成、章节细纲拆解的前端入口。
6. 补上状态追踪自动提取的页面入口，并修好保存链路。

### P2（体验和管理完善）

1. 增加项目编辑页面或项目基础信息编辑弹窗。
2. 补上 AI 对话历史加载/服务器清空。
3. 补上导出历史、批量导出。
4. 恢复 ESLint，补最基本的前后端冒烟测试。

---

## 10. 最终判断

如果以“已经有页面”作为标准，这个项目看起来完成度不低；但如果以“页面操作后能真正完成业务目标”作为标准，当前仍属于：

**基础框架已成型，核心 CRUD 可用，但高级功能和页面闭环还没有达到可交付状态。**

尤其需要注意：

- 有些问题不是“还没做”，而是“看起来做了，实际会报错”。
- 当前最应该优先做的是修复阻断级链路，再把页面里的占位功能补成真实功能。
