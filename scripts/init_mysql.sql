-- ============================================================
-- AI单元剧小说创作助手 - MySQL 数据库初始化脚本
-- 仅参考 PROJECT_PLAN.md 功能设定设计，支持全部业务表结构
-- 字符集: utf8mb4 | 引擎: InnoDB
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 创建数据库 InkMate
CREATE DATABASE IF NOT EXISTS InkMate;
USE InkMate;

-- ----------------------------
-- 1. 用户与认证
-- ----------------------------
CREATE TABLE IF NOT EXISTS `users` (
    `id` CHAR(36) NOT NULL COMMENT '用户ID',
    `username` VARCHAR(64) NOT NULL COMMENT '登录名',
    `email` VARCHAR(255) NOT NULL COMMENT '邮箱',
    `password_hash` VARCHAR(255) NOT NULL COMMENT '密码哈希',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_username` (`username`),
    UNIQUE KEY `uk_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 用户设置（AI模型配置、外观、导出设置）
CREATE TABLE IF NOT EXISTS `user_settings` (
    `id` CHAR(36) NOT NULL COMMENT '主键',
    `user_id` CHAR(36) NOT NULL COMMENT '用户ID',
    `setting_key` VARCHAR(64) NOT NULL COMMENT '设置键：ai_model, theme, export_format 等',
    `setting_value` JSON NULL COMMENT '设置值',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_key` (`user_id`, `setting_key`),
    CONSTRAINT `fk_user_settings_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户设置表';

-- ----------------------------
-- 2. 项目
-- ----------------------------
CREATE TABLE IF NOT EXISTS `projects` (
    `id` CHAR(36) NOT NULL COMMENT '项目ID',
    `user_id` CHAR(36) NOT NULL COMMENT '所属用户',
    `title` VARCHAR(200) NOT NULL COMMENT '标题',
    `genre` VARCHAR(50) NULL COMMENT '类型/题材',
    `type` VARCHAR(20) NOT NULL DEFAULT 'novel' COMMENT 'novel=普通长篇, unit_drama=单元剧',
    `description` TEXT NULL COMMENT '简介',
    `tags` JSON NULL COMMENT '标签数组',
    `settings` JSON NULL COMMENT '全局设定：世界观、魔法/科技体系、势力、专有名词等',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_type` (`type`),
    CONSTRAINT `fk_projects_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='小说项目表';

-- ----------------------------
-- 3. 单元（单元剧专用）
-- ----------------------------
CREATE TABLE IF NOT EXISTS `units` (
    `id` CHAR(36) NOT NULL COMMENT '单元ID',
    `project_id` CHAR(36) NOT NULL COMMENT '项目ID',
    `unit_number` INT NOT NULL COMMENT '单元序号',
    `title` VARCHAR(200) NULL COMMENT '单元标题',
    `unit_type` VARCHAR(50) NULL COMMENT 'standalone=独立案件, mainline_related=主线关联, transition=过渡篇章',
    `start_chapter` INT NULL COMMENT '起始章节号',
    `end_chapter` INT NULL COMMENT '结束章节号',
    `settings` JSON NULL COMMENT '单元设定：案件背景、地点、线索伏笔等',
    `outline` JSON NULL COMMENT '单元大纲：开篇钩子、核心冲突、转折点、结局收束、与主线关联',
    `status` VARCHAR(20) NOT NULL DEFAULT 'planning' COMMENT 'planning=未开始, in_progress=进行中, completed=已完成',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_project_id` (`project_id`),
    KEY `idx_unit_number` (`project_id`, `unit_number`),
    CONSTRAINT `fk_units_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='单元剧单元表';

-- ----------------------------
-- 4. 角色
-- ----------------------------
CREATE TABLE IF NOT EXISTS `characters` (
    `id` CHAR(36) NOT NULL COMMENT '角色ID',
    `project_id` CHAR(36) NOT NULL COMMENT '项目ID',
    `unit_id` CHAR(36) NULL COMMENT '单元ID，非空表示单元专属角色',
    `name` VARCHAR(100) NOT NULL COMMENT '姓名',
    `role_type` VARCHAR(20) NULL COMMENT 'protagonist=主角团, supporting=配角, unit_character=单元角色',
    `card_data` JSON NULL COMMENT '角色卡：基本信息、性格、背景、能力、人际关系、角色弧光、出场记录等',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_project_id` (`project_id`),
    KEY `idx_unit_id` (`unit_id`),
    CONSTRAINT `fk_characters_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_characters_unit` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色表';

-- 单元-角色关联（单元内出场角色与客串）
CREATE TABLE IF NOT EXISTS `unit_characters` (
    `id` CHAR(36) NOT NULL COMMENT '主键',
    `unit_id` CHAR(36) NOT NULL COMMENT '单元ID',
    `character_id` CHAR(36) NOT NULL COMMENT '角色ID',
    `is_guest` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0=常驻/本单元角色, 1=客串',
    `guest_note` VARCHAR(500) NULL COMMENT '客串设定说明',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_unit_character` (`unit_id`, `character_id`),
    CONSTRAINT `fk_uc_unit` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_uc_character` FOREIGN KEY (`character_id`) REFERENCES `characters` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='单元角色关联表';

-- ----------------------------
-- 5. 大纲
-- ----------------------------
CREATE TABLE IF NOT EXISTS `outlines` (
    `id` CHAR(36) NOT NULL COMMENT '大纲ID',
    `project_id` CHAR(36) NOT NULL COMMENT '项目ID',
    `unit_id` CHAR(36) NULL COMMENT '单元ID，单元大纲时非空',
    `outline_type` VARCHAR(20) NOT NULL COMMENT 'main=主线大纲, unit=单元大纲, chapter=章节细纲',
    `parent_id` CHAR(36) NULL COMMENT '父级大纲ID',
    `chapter_number` INT NULL COMMENT '章节号，仅章节细纲时使用',
    `sort_order` INT NOT NULL DEFAULT 0 COMMENT '同级排序',
    `content` TEXT NULL COMMENT '大纲内容',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_project_id` (`project_id`),
    KEY `idx_unit_id` (`unit_id`),
    KEY `idx_parent_id` (`parent_id`),
    KEY `idx_chapter` (`project_id`, `chapter_number`),
    CONSTRAINT `fk_outlines_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_outlines_unit` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_outlines_parent` FOREIGN KEY (`parent_id`) REFERENCES `outlines` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='大纲表';

-- ----------------------------
-- 6. 章节
-- ----------------------------
CREATE TABLE IF NOT EXISTS `chapters` (
    `id` CHAR(36) NOT NULL COMMENT '章节ID',
    `project_id` CHAR(36) NOT NULL COMMENT '项目ID',
    `unit_id` CHAR(36) NULL COMMENT '所属单元',
    `chapter_number` INT NOT NULL COMMENT '章节序号',
    `title` VARCHAR(200) NULL COMMENT '章节标题',
    `content` LONGTEXT NULL COMMENT '正文（富文本）',
    `word_count` INT NOT NULL DEFAULT 0 COMMENT '字数',
    `status` VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT 'draft=草稿, finalized=定稿',
    `chapter_guidance` TEXT NULL COMMENT '本章写作指导/生成指导',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_project_chapter` (`project_id`, `chapter_number`),
    KEY `idx_project_id` (`project_id`),
    KEY `idx_unit_id` (`unit_id`),
    CONSTRAINT `fk_chapters_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_chapters_unit` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='章节表';

-- 章节版本历史
CREATE TABLE IF NOT EXISTS `chapter_versions` (
    `id` CHAR(36) NOT NULL COMMENT '版本ID',
    `chapter_id` CHAR(36) NOT NULL COMMENT '章节ID',
    `version_number` INT NOT NULL COMMENT '版本号',
    `content` LONGTEXT NULL COMMENT '该版本正文',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_chapter_id` (`chapter_id`),
    CONSTRAINT `fk_versions_chapter` FOREIGN KEY (`chapter_id`) REFERENCES `chapters` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='章节版本表';

-- 章节-角色出场记录
CREATE TABLE IF NOT EXISTS `chapter_characters` (
    `id` CHAR(36) NOT NULL COMMENT '主键',
    `chapter_id` CHAR(36) NOT NULL COMMENT '章节ID',
    `character_id` CHAR(36) NOT NULL COMMENT '角色ID',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_chapter_character` (`chapter_id`, `character_id`),
    CONSTRAINT `fk_cc_chapter` FOREIGN KEY (`chapter_id`) REFERENCES `chapters` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_cc_character` FOREIGN KEY (`character_id`) REFERENCES `characters` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='章节角色出场记录';

-- 批注（自建批注、AI建议批注）
CREATE TABLE IF NOT EXISTS `annotations` (
    `id` CHAR(36) NOT NULL COMMENT '批注ID',
    `chapter_id` CHAR(36) NOT NULL COMMENT '章节ID',
    `anchor_start` INT NOT NULL COMMENT '锚点起始位置',
    `anchor_end` INT NOT NULL COMMENT '锚点结束位置',
    `content` TEXT NULL COMMENT '批注内容',
    `annotation_type` VARCHAR(20) NOT NULL DEFAULT 'user' COMMENT 'user=自建, ai=AI建议',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_chapter_id` (`chapter_id`),
    CONSTRAINT `fk_annotations_chapter` FOREIGN KEY (`chapter_id`) REFERENCES `chapters` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='批注表';

-- ----------------------------
-- 7. 状态追踪
-- ----------------------------
CREATE TABLE IF NOT EXISTS `tracking_records` (
    `id` CHAR(36) NOT NULL COMMENT '记录ID',
    `project_id` CHAR(36) NOT NULL COMMENT '项目ID',
    `tracking_type` VARCHAR(50) NOT NULL COMMENT 'character_state, foreshadowing, item, timeline, unit_progress',
    `entity_id` CHAR(36) NULL COMMENT '关联实体ID（角色/物品/单元等）',
    `chapter_number` INT NULL COMMENT '来源章节号',
    `state_data` JSON NULL COMMENT '状态数据',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_project_id` (`project_id`),
    KEY `idx_tracking_type` (`project_id`, `tracking_type`),
    KEY `idx_entity` (`entity_id`),
    CONSTRAINT `fk_tracking_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='状态追踪表';

-- ----------------------------
-- 8. AI 对话记录
-- ----------------------------
CREATE TABLE IF NOT EXISTS `chat_messages` (
    `id` CHAR(36) NOT NULL COMMENT '消息ID',
    `project_id` CHAR(36) NOT NULL COMMENT '项目ID',
    `chapter_id` CHAR(36) NULL COMMENT '关联章节（可选）',
    `role` VARCHAR(20) NOT NULL COMMENT 'user, assistant',
    `content` TEXT NULL COMMENT '消息内容',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_project_id` (`project_id`),
    KEY `idx_chapter_id` (`chapter_id`),
    KEY `idx_created` (`project_id`, `created_at`),
    CONSTRAINT `fk_chat_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_chat_chapter` FOREIGN KEY (`chapter_id`) REFERENCES `chapters` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI对话记录表';

-- ----------------------------
-- 9. AI 生成任务（记录章节/大纲/角色等生成任务状态）
-- ----------------------------
CREATE TABLE IF NOT EXISTS `generation_tasks` (
    `id` CHAR(36) NOT NULL COMMENT '任务 ID',
    `project_id` CHAR(36) NOT NULL COMMENT '项目 ID',
    `unit_id` CHAR(36) NULL COMMENT '单元 ID（可选）',
    `chapter_id` CHAR(36) NULL COMMENT '章节 ID（可选）',
    `task_type` VARCHAR(30) NOT NULL COMMENT 'chapter=章节生成，continue=续写，rewrite=改写，expand=扩写，outline=大纲，character=角色卡',
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending=等待中，running=进行中，completed=已完成，failed=失败，cancelled=已取消',
    `prompt` TEXT NULL COMMENT '生成提示词',
    `result` LONGTEXT NULL COMMENT '生成结果（流式完整内容）',
    `error_message` TEXT NULL COMMENT '错误信息',
    `tokens_used` INT NULL COMMENT '消耗的 token 数',
    `model_name` VARCHAR(50) NULL COMMENT '使用的 AI 模型名称',
    `progress` INT NOT NULL DEFAULT 0 COMMENT '进度百分比 0-100',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `completed_at` DATETIME NULL COMMENT '完成时间',
    PRIMARY KEY (`id`),
    KEY `idx_project_id` (`project_id`),
    KEY `idx_status` (`status`),
    KEY `idx_task_type` (`task_type`),
    CONSTRAINT `fk_gt_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_gt_unit` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_gt_chapter` FOREIGN KEY (`chapter_id`) REFERENCES `chapters` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI 生成任务表';

-- ----------------------------
-- 10. 导出任务（支持 TXT/EPUB/DOCX 格式导出）
-- ----------------------------
CREATE TABLE IF NOT EXISTS `export_tasks` (
    `id` CHAR(36) NOT NULL COMMENT '任务 ID',
    `project_id` CHAR(36) NOT NULL COMMENT '项目 ID',
    `user_id` CHAR(36) NOT NULL COMMENT '用户 ID',
    `unit_id` CHAR(36) NULL COMMENT '单元 ID（可选，导出单个单元）',
    `export_format` VARCHAR(20) NOT NULL COMMENT 'txt, epub, docx, pdf',
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending=等待中，processing=处理中，completed=已完成，failed=失败',
    `chapter_range_start` INT NULL COMMENT '导出章节起始号',
    `chapter_range_end` INT NULL COMMENT '导出章节结束号',
    `options` JSON NULL COMMENT '导出选项：是否包含批注、是否分卷等',
    `file_path` VARCHAR(500) NULL COMMENT '生成文件路径',
    `file_size` BIGINT NULL COMMENT '文件大小（字节）',
    `error_message` TEXT NULL COMMENT '错误信息',
    `progress` INT NOT NULL DEFAULT 0 COMMENT '进度百分比 0-100',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `expires_at` DATETIME NULL COMMENT '文件过期时间',
    PRIMARY KEY (`id`),
    KEY `idx_project_id` (`project_id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_status` (`status`),
    CONSTRAINT `fk_et_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_et_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_et_unit` FOREIGN KEY (`unit_id`) REFERENCES `units` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='导出任务表';

-- ----------------------------
-- 11. 向量同步映射（与 Milvus 主键对应，便于增量同步）
-- ----------------------------
CREATE TABLE IF NOT EXISTS `embedding_sync_log` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增ID，与 Milvus 主键一致',
    `project_id` CHAR(36) NOT NULL COMMENT '项目ID',
    `entity_type` VARCHAR(30) NOT NULL COMMENT 'chapter, setting, character 等',
    `entity_id` CHAR(36) NOT NULL COMMENT '业务实体ID',
    `milvus_id` BIGINT NOT NULL COMMENT 'Milvus 集合中的主键',
    `synced_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_entity` (`entity_type`, `entity_id`),
    KEY `idx_project` (`project_id`, `entity_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='向量同步日志（与Milvus 4096维集合对应）';

SET FOREIGN_KEY_CHECKS = 1;
