# InfoMind - 个人知识管理系统

> 将你没时间看的网络内容，智能整理成一座个人知识书架 📚

---

## ✨ 功能特性

- **多平台支持** — YouTube、Bilibili、Twitter/X、小红书、知乎、知乎等
- **AI 智能分类** — 通过大模型自动识别行业类别（25个分类）
- **书架式可视化** — 同作者内容自动聚合为一本"书"，3D书脊效果
- **OpenClaw 集成** — 通过 Skill 或 Webhook 让 AI Agent 转发链接
- **CLI 工具** — 命令行直接管理知识库
- **全文搜索** — 按标题、摘要、标签、作者搜索

---

## 🚀 快速开始

### 1. 安装依赖并启动

```bash
cd infoMind
npm install
npm start
```

访问 [http://localhost:3456](http://localhost:3456) 打开书架界面。

### 2. 配置大模型 API Key

**通过 Web UI：** 点击右上角 ⚙️ → 填写 API Key → 测试连接 → 保存

**通过 CLI：**
```bash
node cli/index.js config set llm.base_url https://api.openai.com/v1
node cli/index.js config set llm.api_key sk-your-key-here
node cli/index.js config set llm.model gpt-4o-mini
```

> 支持任何 OpenAI Compatible 接口（OpenAI、Anthropic Claude via proxy、通义千问、本地 Ollama 等）

---

## 📚 CLI 使用

```bash
# 启动服务
node cli/index.js serve

# 添加链接
node cli/index.js add "https://www.youtube.com/watch?v=xxx"
node cli/index.js add "https://www.bilibili.com/video/BVxxx" --note "值得深读"

# 查看列表
node cli/index.js list
node cli/index.js list --category "人工智能" --limit 10

# 搜索内容
node cli/index.js search "深度学习"

# 统计
node cli/index.js stats

# 系统诊断
node cli/index.js doctor
```

---

## 🔌 OpenClaw 集成

### 方式一：Skill（推荐）

将 `openclaw/SKILL.md` 放到 OpenClaw Skill 目录：

```bash
cp -r openclaw/SKILL.md ~/.openclaw/skills/infomind/SKILL.md
```

之后你可以直接对 OpenClaw 说：
- *"帮我收藏这个 https://youtube.com/..."*
- *"我之前收藏的关于 AI 的内容"*
- *"我的知识库有多少东西了"*

### 方式二：Webhook

```bash
openclaw hooks add infomind \
  --url http://localhost:3456/api/webhook/openclaw \
  --events message.link
```

---

## 🏗️ 项目结构

```
infoMind/
├── server/          # 后端 Node.js + Express
│   ├── db/          # SQLite 数据库
│   ├── routes/      # REST API 路由
│   ├── services/    # 业务逻辑（解析器、LLM、分类、书籍）
│   └── utils/       # 工具类
├── public/          # 前端 Web UI
│   ├── css/         # 样式
│   └── js/          # JavaScript 模块
├── cli/             # CLI 工具
├── openclaw/        # OpenClaw Skill 定义
├── data/            # 运行时数据（数据库、封面图缓存）
└── prd.md           # 产品需求文档
```

---

## 📊 支持的平台

| 平台 | 解析方式 | 获取封面 |
|------|---------|---------|
| Bilibili | 官方 API | ✅ |
| YouTube | oEmbed API | ✅ |
| Twitter/X | oEmbed API | ❌ (平台限制) |
| 小红书 | Open Graph | 部分 |
| 知乎 | Open Graph | 部分 |
| 通用网页 | Open Graph | ✅ |

---

## ⚙️ 环境变量

```bash
INFOMIND_PORT=3456              # 服务端口（默认 3456）
INFOMIND_DB_PATH=./data/infomind.db  # 数据库路径
INFOMIND_SECRET=your-secret     # 加密密钥（可选）
```

---

## 📄 许可证

MIT
