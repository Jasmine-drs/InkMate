-- ============================================================
-- 修复 users 表 - 添加缺失的字段
-- ============================================================

USE InkMate;

-- 添加 is_active 字段 (如果不存在)
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'users'
  AND COLUMN_NAME = 'is_active';

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN `is_active` BOOLEAN NOT NULL DEFAULT TRUE COMMENT ''是否激活''',
  'SELECT "Column is_active already exists"');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加 is_verified 字段 (如果不存在)
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'users'
  AND COLUMN_NAME = 'is_verified';

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN `is_verified` BOOLEAN NOT NULL DEFAULT FALSE COMMENT ''是否验证''',
  'SELECT "Column is_verified already exists"');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Database fix completed!' AS status;
