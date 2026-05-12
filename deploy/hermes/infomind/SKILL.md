---
name: infomind
description: InfoMind 个人知识库，适用于终端主 channel、飞书/Lark channel 和其他 Hermes gateway channel。用户发送链接并说“收录、收藏、保存、记录、记一下、存一下、加入书架、稍后看”时，自动把 URL 保存到 InfoMind；也支持搜索已收录内容、读取书架、查看统计和生成阅读计划。Also triggers on save, collect, bookmark, remember, read later.
---

# InfoMind Personal Knowledge Skill

Use this skill when the user wants to save a URL, search previously saved content, review the bookshelf, or plan daily reading.

Important: if a user message contains a URL plus any collection keyword such as `收录`, `收藏`, `保存`, `记录`, `记一下`, `存一下`, `加入书架`, or `稍后看`, this skill must be used to save the URL to InfoMind.

This applies in every Agent channel, including terminal/main channel, Feishu/Lark group chats, Feishu/Lark direct messages, and any Hermes gateway channel. Bot mentions, group chat prefixes, Feishu rich-text formatting, quoted text, or link preview formatting must not prevent using this skill when the visible message contains a URL and collection intent.

## Configuration

Read the InfoMind base URL from `INFOMIND_BASE_URL`. If it is not set, use `http://127.0.0.1:3456`.

## Auto Save Trigger

When a user message contains at least one URL and an explicit collection intent, save the URL to InfoMind immediately. Do not ask for confirmation.

Collection intent includes Chinese phrases such as:

- 收录
- 收藏
- 保存
- 记录
- 记一下
- 加入书架
- 稍后看
- 存一下

Collection intent also includes English phrases such as:

- save
- collect
- bookmark
- remember
- read later
- add to knowledge base

Examples that should save automatically:

- `收录 https://example.com/article`
- `帮我收藏这个 https://youtube.com/watch?v=...`
- `这个稍后看 https://...`
- `save this https://...`

If the user sends multiple URLs with a collection intent, save each URL separately.

If the user sends a URL without collection intent, only save it when the surrounding request clearly means collection. For example, save for "这个不错，记一下 <URL>", but do not save for "帮我总结这个 <URL>" unless the user also asks to save it.

## Save a Link

For each URL that should be saved, call:

```bash
curl -s -X POST "$INFOMIND_BASE_URL/api/entries" \
  -H "Content-Type: application/json" \
  -d '{"url":"<URL>","note":"<optional user note>"}'
```

Put any user-provided note or surrounding context into `note` when useful. Tell the user the saved title, category, and whether it was already present. If InfoMind returns `URL already exists`, treat that as already saved and tell the user it was already in the knowledge base.

## Search Saved Knowledge

When the user asks about previously saved material:

```bash
curl -s "$INFOMIND_BASE_URL/api/entries/search?q=<keyword>&limit=10"
```

Summarize the most relevant matches with title, author, category, and URL.

## Daily Reading Plan

When the user asks for a daily reading plan:

1. Fetch overview stats:

```bash
curl -s "$INFOMIND_BASE_URL/api/stats"
```

2. Fetch recent entries:

```bash
curl -s "$INFOMIND_BASE_URL/api/entries?limit=20"
```

3. Select 3 to 5 items:
   - Prefer recently saved unread-looking material.
   - Balance categories when possible.
   - Group short items before long videos.
   - Include a concrete reading order and a short reason for each item.

## Book Management

When the user asks to inspect authors, books, or shelves:

```bash
curl -s "$INFOMIND_BASE_URL/api/books?limit=20"
```

For a specific book:

```bash
curl -s "$INFOMIND_BASE_URL/api/books/<book_id>"
```

Use book entries to suggest what to read next or summarize a creator's saved material.
