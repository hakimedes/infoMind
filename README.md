# InfoMind

InfoMind 是一个个人知识管理系统，用来把分散在网页、视频、社交平台和公众号里的内容收录、解析、分类，并以书架、时间线和洞察图表的方式回看。

核心目标不是保存链接本身，而是把碎片化阅读内容整理成可检索、可复盘、可被 Agent 使用的个人知识库。

## 功能概览

- **链接收录**：支持通过 Web UI、CLI、OpenClaw/Hermes Skill 和 Webhook 保存链接。
- **多平台解析**：内置 Bilibili、YouTube、Twitter/X、小红书、知乎、小宇宙和通用网页解析器。
- **封面缓存**：解析封面图并下载到本地 `data/covers/`，降低远程图片失效和防盗链影响。
- **AI 分类**：接入 OpenAI-compatible LLM 进行 25 个一级知识分类；LLM 不可用时使用关键词兜底。
- **作者聚合书架**：同作者、同平台内容自动聚合为一本“书”，书架页显示最新收录标题和封面。
- **时间线视图**：按时间查看所有收录内容，支持分类筛选。
- **洞察页**：提供收录趋势折线图和分类/平台/作者嵌套 Treemap，用于复盘注意力分布。
- **全文搜索**：支持按标题、摘要、作者、标签和备注搜索。
- **配置管理**：Web UI 和 CLI 均可配置 LLM 参数；敏感 API Key 会加密保存。
- **部署支持**：提供 Dockerfile、Docker Compose、生产环境变量模板和云服务器部署手册。

## 快速开始

### 环境要求

- Node.js >= 18
- npm
- SQLite 由 `better-sqlite3` 内嵌使用，无需单独部署数据库

### 安装与启动

```bash
npm install
npm start
```

默认服务地址：

```text
http://localhost:3456
```

可通过环境变量修改端口：

```bash
INFOMIND_PORT=3457 npm start
```

健康检查：

```bash
curl -s http://127.0.0.1:3456/api/health
```

## LLM 配置

InfoMind 支持 OpenAI-compatible 接口。配置项保存在 SQLite `config` 表中。

### Web UI 配置

打开右上角设置：

```text
Settings -> LLM Parameters -> Test Connection -> Save Configuration
```

### CLI 配置

```bash
node cli/index.js config set llm.base_url https://api.openai.com/v1
node cli/index.js config set llm.api_key sk-your-key-here
node cli/index.js config set llm.model gpt-4o-mini
```

生产环境迁移时，如果已经使用过自定义 `INFOMIND_SECRET`，需要在新环境保持一致，否则已加密保存的配置可能无法解密。

## 使用方式

### Web UI

打开 `http://localhost:3456` 后可以：

- 粘贴链接收录内容；
- 在书架页按作者聚合浏览；
- 在时间线页按日期回看；
- 在洞察页查看趋势图和注意力 Treemap；
- 搜索标题、摘要、作者、标签和备注；
- 配置并测试 LLM。

### CLI

```bash
# 启动服务
node cli/index.js serve

# 添加链接
node cli/index.js add "https://www.bilibili.com/video/BVxxx"
node cli/index.js add "https://www.youtube.com/watch?v=xxx" --note "值得深读"

# 查看列表
node cli/index.js list
node cli/index.js list --category "人工智能" --limit 10

# 搜索
node cli/index.js search "RAG"

# 统计
node cli/index.js stats

# 诊断
node cli/index.js doctor
```

### Agent / Webhook 接入

OpenClaw Skill 位于：

```text
openclaw/SKILL.md
```

Webhook 地址：

```text
POST /api/webhook/openclaw
```

请求体可传：

```json
{
  "message": "帮我收藏这篇 https://example.com/article",
  "urls": ["https://example.com/article"]
}
```

如果配置了 `webhook.secret`，服务会校验 `x-openclaw-signature` 或 `x-signature` 的 HMAC 签名。

## 支持平台

| 平台 | 平台识别 | 元数据解析 | 封面 |
| --- | --- | --- | --- |
| Bilibili | `bilibili` | 视频标题、作者、封面 | 支持 |
| YouTube | `youtube` | oEmbed 元数据 | 支持 |
| Twitter/X | `twitter` | oEmbed 元数据 | 平台限制较多 |
| 小红书 | `xiaohongshu` | Open Graph + 页面结构兜底 | 部分支持 |
| 知乎 | `zhihu` | Open Graph + 分享文本兜底 | 部分支持 |
| 小宇宙 | `xiaoyuzhou` | 播客/单集标题、节目名、封面 | 支持 |
| 通用网页 | `web` | Open Graph / HTML meta | 支持 |

## 洞察页数据模型

洞察页使用真实数据库数据渲染，不使用模拟数据。

接口：

```text
GET /api/stats/advanced?range=1m
GET /api/stats/advanced?range=1m&category=人工智能
GET /api/stats/advanced?range=1m&platform=wechat
```

支持时间范围：

- `1w`：近 1 周
- `1m`：近 30 天
- `3m`：近 3 月
- `1y`：近 1 年

返回内容包括：

- `summary`：总收录数、上一周期对比、活跃天数、最高分类；
- `trend`：按天聚合的收录趋势；
- `heatmap`：分类 -> 平台/作者 -> 最近标题的嵌套 Treemap 数据；
- `platforms`：平台分布。

Treemap 面积按收藏频次计算：

```text
一级区块 = 知识类别
二级图块 = 平台 + 作者
图块面积 = 当前筛选条件下的收录频次
```

## API 摘要

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/health` | 健康检查 |
| `POST` | `/api/entries` | 新增收录 |
| `GET` | `/api/entries` | 列出收录，支持 `category`、`platform`、`page`、`limit` |
| `GET` | `/api/entries/search?q=...` | 搜索收录 |
| `GET` | `/api/entries/:id` | 获取单条收录 |
| `PUT` | `/api/entries/:id` | 更新收录 |
| `DELETE` | `/api/entries/:id` | 删除收录 |
| `GET` | `/api/entries/:id/analysis` | 获取当前条目的结构化解读结果 |
| `POST` | `/api/entries/:id/analyze` | 基于真实正文/转录生成并缓存思维导图 |
| `PUT` | `/api/entries/:id/content` | Agent/Hermes 回写正文、字幕或转录文本 |
| `GET` | `/api/books` | 列出作者聚合书籍 |
| `GET` | `/api/books/:id` | 获取书籍及其条目 |
| `GET` | `/api/categories` | 获取 25 个分类及统计 |
| `GET` | `/api/stats` | 基础统计 |
| `GET` | `/api/stats/advanced` | 洞察页趋势与 Treemap 数据 |
| `GET` | `/api/config` | 获取配置，敏感值脱敏 |
| `PUT` | `/api/config` | 保存配置 |
| `POST` | `/api/config/test-llm` | 测试 LLM 连接 |
| `POST` | `/api/webhook/openclaw` | Agent/Webhook 链接收录 |

## 项目结构

```text
infoMind/
├── server/
│   ├── db/                 # SQLite schema、初始化、查询封装
│   ├── routes/             # REST API：entries、books、stats、config、webhook
│   ├── services/
│   │   ├── parser/         # 各平台解析器
│   │   ├── bookmaker.js    # 作者聚合成书
│   │   ├── classifier.js   # LLM 分类 + 关键词兜底
│   │   └── llm.js          # OpenAI-compatible LLM 调用
│   └── utils/              # 日志、加密工具
├── public/
│   ├── index.html          # Web UI 主页面
│   ├── setup.html          # 配置/初始化辅助页面
│   ├── js/                 # 前端模块：API、书架、弹窗、洞察页、设置
│   └── css/                # 旧版/补充样式
├── cli/                    # 命令行入口和子命令
├── openclaw/               # OpenClaw Skill
├── deploy/
│   ├── README.md           # 云服务器部署手册
│   └── hermes/             # Hermes Skill 安装脚本和 Skill 定义
├── data/                   # 运行时数据，默认不提交
├── Dockerfile
├── docker-compose.yml
├── .env.production.example
├── prd.md
└── ui_design.md
```

## 数据与存储

默认数据库路径：

```text
data/infomind.db
```

SQLite 开启 WAL 模式，运行时可能同时存在：

```text
data/infomind.db
data/infomind.db-wal
data/infomind.db-shm
data/covers/
```

这些都是运行时数据，默认不进入 Git。

核心表：

- `entries`：单条收录内容；
- `books`：同作者、同平台聚合后的书；
- `categories`：预置 25 个一级分类；
- `config`：系统配置和加密后的敏感配置。

## Docker 部署

本仓库提供 Docker Compose 配置：

```bash
cp .env.production.example .env.production
docker compose up -d --build
docker compose logs -f infomind
curl -s http://127.0.0.1:3456/api/health
```

默认只暴露到服务器本机：

```text
127.0.0.1:3456:3456
```

公网访问建议通过 Nginx 或 Caddy 做 HTTPS 反向代理。

完整云服务器部署、首次 SQLite 数据迁移、Hermes Agent 接入、飞书/Lark 通道和备份策略见：

```text
deploy/README.md
```

## 验证与测试

当前项目没有独立测试套件，基础验证建议使用：

```bash
node --check server/index.js
node --check server/routes/stats.js
node --check public/js/app.js
node --check public/js/api.js
npm start
curl -s http://127.0.0.1:3456/api/health
curl -s 'http://127.0.0.1:3456/api/stats/advanced?range=1m'
```

如果修改 UI，建议同时在浏览器里验证：

- 书架页是否能加载；
- 时间线页是否能加载；
- 洞察页折线图与 Treemap 是否按真实数据渲染；
- 设置页是否能保存并测试 LLM 配置。

## 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `INFOMIND_PORT` | `3456` | HTTP 服务端口 |
| `INFOMIND_DB_PATH` | `data/infomind.db` | SQLite 数据库路径 |
| `INFOMIND_SECRET` | 内置默认值 | 配置加密密钥，生产环境应显式设置并保持稳定 |
| `INFOMIND_PUBLIC_URL` | 空 | 可选，部署文档和 Agent 集成使用 |

## 注意事项

- 数据库、WAL 文件、封面缓存和备份文件不应提交到 Git。
- 迁移生产环境时应同步整个 `data/` 目录，而不是只复制 `.db` 文件。
- 小红书、知乎、X 等平台页面结构和访问策略变化较快，解析器包含兜底逻辑，但不能保证所有链接都能稳定拿到完整封面和作者。
- `INFOMIND_SECRET` 变更会影响已加密配置的解密。

## License

MIT
