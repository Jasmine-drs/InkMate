# 数据库表结构与模型对比报告

生成时间：2026-02-28

## 已修复的问题

| 表名 | 问题 | 状态 |
|------|------|------|
| projects | `updated_at` 没有 server_default | ✅ 已修复 |
| chapters | `updated_at` 没有 server_default | ✅ 已修复 |
| units | `updated_at` 没有 server_default | ✅ 已修复 |
| characters | `updated_at` 没有 server_default | ✅ 已修复 |
| outlines | `updated_at` 没有 server_default | ✅ 已修复 |
| tracking_records | `updated_at` 没有 server_default | ✅ 已修复 |
| generation_tasks | `updated_at` 没有 server_default | ✅ 已修复 |

## 表结构与模型对比

### 1. users 表
| 字段 | SQL 脚本 | Python 模型 | 状态 |
|------|---------|------------|------|
| id | CHAR(36) | String(36) | ✅ |
| username | VARCHAR(64) | String(64) | ✅ |
| email | VARCHAR(255) | String(255) | ✅ |
| password_hash | VARCHAR(255) | String(255) | ✅ |
| is_active | BOOLEAN | Boolean | ✅ |
| is_verified | BOOLEAN | Boolean | ✅ |
| created_at | DATETIME | DateTime | ✅ |
| updated_at | DATETIME | DateTime | ✅ |

### 2. projects 表
| 字段 | SQL 脚本 | Python 模型 | 状态 |
|------|---------|------------|------|
| id | CHAR(36) | String(36) | ✅ |
| user_id | CHAR(36) | String(36) | ✅ |
| title | VARCHAR(200) | String(200) | ✅ |
| genre | VARCHAR(50) | String(50) | ✅ |
| type | VARCHAR(20) | String(20) | ✅ |
| description | TEXT | Text | ✅ |
| tags | JSON | ❌ 缺失 | ⚠️ 可选 |
| settings | JSON | JSON | ✅ |
| cover_url | VARCHAR(500) | String(500) | ✅ |
| is_public | BOOLEAN | Boolean | ✅ |
| created_at | DATETIME | DateTime | ✅ |
| updated_at | DATETIME | DateTime | ✅ |

注：`tags` 字段在 SQL 脚本中定义，但当前功能未使用，可暂不添加。

### 3. units 表
| 字段 | SQL 脚本 | Python 模型 | 状态 |
|------|---------|------------|------|
| id | CHAR(36) | String(36) | ✅ |
| project_id | CHAR(36) | String(36) | ✅ |
| unit_number | INT | Integer | ✅ |
| title | VARCHAR(200) | String(200) | ✅ |
| unit_type | VARCHAR(50) | String(50) | ✅ |
| start_chapter | INT | Integer | ✅ |
| end_chapter | INT | Integer | ✅ |
| settings | JSON | JSON | ✅ |
| outline | JSON | JSON | ✅ |
| status | VARCHAR(20) | String(20) | ✅ |
| created_at | DATETIME | DateTime | ✅ |
| updated_at | DATETIME | DateTime | ✅ |

### 4. characters 表
| 字段 | SQL 脚本 | Python 模型 | 状态 |
|------|---------|------------|------|
| id | CHAR(36) | String(36) | ✅ |
| project_id | CHAR(36) | String(36) | ✅ |
| unit_id | CHAR(36) | String(36) | ✅ |
| name | VARCHAR(100) | String(100) | ✅ |
| role_type | VARCHAR(20) | String(20) | ✅ |
| card_data | JSON | JSON | ✅ |
| created_at | DATETIME | DateTime | ✅ |
| updated_at | DATETIME | DateTime | ✅ |

### 5. outlines 表
| 字段 | SQL 脚本 | Python 模型 | 状态 |
|------|---------|------------|------|
| id | CHAR(36) | String(36) | ✅ |
| project_id | CHAR(36) | String(36) | ✅ |
| unit_id | CHAR(36) | String(36) | ✅ |
| outline_type | VARCHAR(20) | String(20) | ✅ |
| parent_id | CHAR(36) | String(36) | ✅ |
| chapter_number | INT | Integer | ✅ |
| sort_order | INT | Integer | ✅ |
| content | TEXT | Text | ✅ |
| created_at | DATETIME | DateTime | ✅ |
| updated_at | DATETIME | DateTime | ✅ |

### 6. chapters 表
| 字段 | SQL 脚本 | Python 模型 | 状态 |
|------|---------|------------|------|
| id | CHAR(36) | String(36) | ✅ |
| project_id | CHAR(36) | String(36) | ✅ |
| unit_id | CHAR(36) | String(36) | ✅ |
| chapter_number | INT | Integer | ✅ |
| title | VARCHAR(200) | String(200) | ✅ |
| content | LONGTEXT | Text | ✅ |
| word_count | INT | Integer | ✅ |
| status | VARCHAR(20) | String(20) | ✅ |
| chapter_guidance | TEXT | Text | ✅ |
| created_at | DATETIME | DateTime | ✅ |
| updated_at | DATETIME | DateTime | ✅ |

### 7. chapter_versions 表
| 字段 | SQL 脚本 | Python 模型 | 状态 |
|------|---------|------------|------|
| id | CHAR(36) | String(36) | ✅ |
| chapter_id | CHAR(36) | String(36) | ✅ |
| version_number | INT | Integer | ✅ |
| content | LONGTEXT | Text | ✅ |
| created_at | DATETIME | DateTime | ✅ |

### 8. tracking_records 表
| 字段 | SQL 脚本 | Python 模型 | 状态 |
|------|---------|------------|------|
| id | CHAR(36) | String(36) | ✅ |
| project_id | CHAR(36) | String(36) | ✅ |
| tracking_type | VARCHAR(50) | String(50) | ✅ |
| entity_id | CHAR(36) | String(36) | ✅ |
| chapter_number | INT | Integer | ✅ |
| state_data | JSON | JSON | ✅ |
| created_at | DATETIME | DateTime | ✅ |
| updated_at | DATETIME | DateTime | ✅ |

### 9. chat_messages 表
| 字段 | SQL 脚本 | Python 模型 | 状态 |
|------|---------|------------|------|
| id | CHAR(36) | String(36) | ✅ |
| project_id | CHAR(36) | String(36) | ✅ |
| chapter_id | CHAR(36) | String(36) | ✅ |
| role | VARCHAR(20) | String(20) | ✅ |
| content | TEXT | Text | ✅ |
| created_at | DATETIME | DateTime | ✅ |

### 10. generation_tasks 表
| 字段 | SQL 脚本 | Python 模型 | 状态 |
|------|---------|------------|------|
| id | CHAR(36) | String(36) | ✅ |
| project_id | CHAR(36) | String(36) | ✅ |
| unit_id | CHAR(36) | String(36) | ✅ |
| chapter_id | CHAR(36) | String(36) | ✅ |
| task_type | VARCHAR(30) | String(30) | ✅ |
| status | VARCHAR(20) | String(20) | ✅ |
| prompt | TEXT | Text | ✅ |
| result | LONGTEXT | Text | ✅ |
| error_message | TEXT | Text | ✅ |
| tokens_used | INT | Integer | ✅ |
| model_name | VARCHAR(50) | String(50) | ✅ |
| progress | INT | Integer | ✅ |
| created_at | DATETIME | DateTime | ✅ |
| updated_at | DATETIME | DateTime | ✅ |
| completed_at | DATETIME | DateTime | ✅ |

## 未使用的表（SQL 有但模型未定义）

以下表在 SQL 脚本中定义，但当前 Python 模型中未使用：

| 表名 | 用途 | 建议 |
|------|------|------|
| user_settings | 用户设置 | 后续添加 |
| unit_characters | 单元角色关联 | 后续添加 |
| chapter_characters | 章节角色出场记录 | 后续添加 |
| annotations | 批注 | 后续添加 |
| export_tasks | 导出任务 | 后续添加 |
| embedding_sync_log | 向量同步日志 | 后续添加 |

## 结论

当前核心表结构与 Python 模型基本一致，主要问题已修复：
1. ✅ 所有 `updated_at` 字段已添加 `server_default=func.now()`
2. ✅ `projects` 表的 `cover_url` 和 `is_public` 字段已添加
3. ⚠️ `projects.tags` 字段暂未使用，可后续添加
