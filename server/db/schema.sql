-- InfoMind Database Schema

-- 分类表（预置25个行业分类）
CREATE TABLE IF NOT EXISTS categories (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    name_en     TEXT NOT NULL,
    icon        TEXT NOT NULL,
    color       TEXT NOT NULL DEFAULT '#6b7280',
    sort_order  INTEGER DEFAULT 0
);

-- "书"表（同作者内容聚合）
CREATE TABLE IF NOT EXISTS books (
    id          TEXT PRIMARY KEY,
    author      TEXT NOT NULL,
    author_id   TEXT,
    platform    TEXT NOT NULL,
    category    TEXT NOT NULL,
    title       TEXT,
    cover_url   TEXT,
    cover_local TEXT,
    entry_count INTEGER DEFAULT 1,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 内容条目表
CREATE TABLE IF NOT EXISTS entries (
    id           TEXT PRIMARY KEY,
    url          TEXT NOT NULL UNIQUE,
    platform     TEXT NOT NULL,
    title        TEXT,
    author       TEXT,
    author_id    TEXT,
    cover_url    TEXT,
    cover_local  TEXT,
    summary      TEXT,
    note         TEXT,
    category     TEXT NOT NULL DEFAULT '其他',
    sub_category TEXT,
    tags         TEXT DEFAULT '[]',
    book_id      TEXT,
    source_data  TEXT DEFAULT '{}',
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE SET NULL
);

-- 系统配置表
CREATE TABLE IF NOT EXISTS config (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_entries_category   ON entries(category);
CREATE INDEX IF NOT EXISTS idx_entries_platform   ON entries(platform);
CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_entries_book_id    ON entries(book_id);
CREATE INDEX IF NOT EXISTS idx_books_category     ON books(category);
CREATE INDEX IF NOT EXISTS idx_books_platform     ON books(platform);
