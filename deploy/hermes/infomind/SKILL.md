---
name: infomind
description: Automatically save URLs to InfoMind when the user asks to collect, save, bookmark, remember, or read later; also search the personal knowledge shelf and prepare daily reading plans.
---

# InfoMind Personal Knowledge Skill

Use this skill when the user wants to save a URL, search previously saved content, review the bookshelf, or plan daily reading.

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
