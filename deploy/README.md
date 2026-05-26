# InfoMind 云服务器部署手册

这份文档用于把当前 InfoMind 项目部署到云服务器，同时保留现有 SQLite 数据，并接入 Hermes Agent 与飞书/Lark 消息渠道。

## 推荐架构

- 使用一台小型 Linux 云服务器/VPS。
- 使用 Docker Compose 运行 `infomind` 服务。
- SQLite 数据保存在宿主机 `./data` 目录，并挂载到容器内 `/app/data`。
- 使用 Nginx 或 Caddy 做 HTTPS 证书和反向代理，转发到 `127.0.0.1:3456`。
- Hermes Agent 和 InfoMind 部署在同一台服务器上，通过 `http://127.0.0.1:3456` 访问 InfoMind。
- Hermes 的飞书/Lark 网关优先使用 WebSocket 模式，除非你明确需要公网 webhook。

## 第一次数据迁移

当前本地有效数据库是 `data/infomind.db`。因为项目启用了 SQLite WAL 模式，第一次迁移时要同步整个 `data/` 目录，包括：

- `data/infomind.db`
- `data/infomind.db-wal`
- `data/infomind.db-shm`
- `data/covers/`

`data/infomind.sqlite` 不是当前项目正在使用的数据库，可以忽略。

### 1. 先在本地创建备份

如果本地 InfoMind 正在运行，建议先停止服务，再执行：

```bash
mkdir -p deploy/backups
tar -czf deploy/backups/infomind-data-$(date +%Y%m%d-%H%M%S).tgz data
```

如果暂时不能停止本地服务，先做一次 SQLite checkpoint，再打包：

```bash
node -e "const Database=require('better-sqlite3'); const db=new Database('data/infomind.db'); db.pragma('wal_checkpoint(TRUNCATE)'); db.close();"
tar -czf deploy/backups/infomind-data-$(date +%Y%m%d-%H%M%S).tgz data
```

### 2. 准备云服务器

在服务器上执行：

```bash
sudo apt update
sudo apt install -y git rsync ca-certificates curl
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

执行完 `usermod` 后，退出 SSH 并重新登录，让 Docker 用户组权限生效。

### 3. 获取项目代码并上传数据

这一步的目的有两个：

1. 让云服务器上有一份可运行的项目代码；
2. 把本地已有的 `data/` 数据目录迁移到服务器，保留现有 entries、books、config 和封面缓存。

如果项目已经上传到 GitHub，代码部分不需要再用 `rsync` 上传，直接在服务器上 clone 即可：

```bash
cd ~
git clone https://github.com/MirrorPeaks/infoMind.git infoMind
cd ~/infoMind
```

然后仍然需要从本地同步 `data/` 目录。默认 `.gitignore` 会忽略数据库、WAL 文件和封面图，这些数据通常不会也不应该提交到 GitHub。

在本地项目目录执行：

```bash
rsync -av data/ user@SERVER:~/infoMind/data/
```

把 `user@SERVER` 替换成你的服务器登录信息。

如果你不通过 GitHub 拉代码，也可以直接用 `rsync` 同步整个项目：

在本地项目目录执行：

```bash
rsync -av --exclude node_modules --exclude .git ./ user@SERVER:~/infoMind/
rsync -av data/ user@SERVER:~/infoMind/data/
```

然后在服务器上执行：

```bash
cd ~/infoMind
cp .env.production.example .env.production
```

编辑 `.env.production`。重点是 `INFOMIND_SECRET`：如果你本地曾经配置过自定义 `INFOMIND_SECRET`，服务器必须使用同一个值，否则数据库里已加密保存的配置，例如 LLM API Key，可能无法正确解密。

如果需要处理没有字幕的 B站/YouTube 视频，把 whisper.cpp 模型放到服务器数据目录：

```bash
mkdir -p ~/infoMind/data/models
# 上传或下载 ggml-base.bin 到 ~/infoMind/data/models/ggml-base.bin
```

对应 `.env.production` 默认配置：

```bash
INFOMIND_STT_MODEL_PATH=/app/data/models/ggml-base.bin
INFOMIND_STT_LANGUAGE=auto
INFOMIND_STT_MAX_DURATION=7200
```

### 4. 启动 InfoMind

在服务器上执行：

```bash
# 进入服务器上的项目目录
cd ~/infoMind

# 构建 Docker 镜像，并在后台启动 InfoMind 容器
# 第一次部署、代码更新、依赖变化后都可以执行这条命令
docker compose up -d --build

# 查看 InfoMind 服务日志
# 如果启动失败、端口被占用、数据库路径错误，通常会在这里看到原因
docker compose logs -f infomind

# 调用健康检查接口
# 返回 {"success":true,"status":"ok",...} 说明服务已经正常启动
curl -s http://127.0.0.1:3456/api/health
```

确认数据已经迁移成功：

```bash
# 进入正在运行的 infomind 容器，读取 SQLite 数据库里的 entries 和 books 数量
# 这一步用于确认服务器上加载的是迁移后的旧数据，而不是一个新的空数据库
docker compose exec infomind node -e "const Database=require('better-sqlite3'); const db=new Database('/app/data/infomind.db',{readonly:true}); console.log(db.prepare('select count(*) entries from entries').get()); console.log(db.prepare('select count(*) books from books').get()); db.close();"
```

以当前本地工作区为准，第一次迁移完成后，在没有新增数据前，预期是 `15` 条 entries 和 `12` 本 books。

### 常见错误：`no configuration file provided: not found`

这个错误表示 `docker compose` 在当前目录没有找到 `docker-compose.yml`。

先在服务器上检查当前目录和文件：

```bash
pwd
ls -la
ls -la docker-compose.yml
```

如果你不是在项目目录，先进入项目目录：

```bash
cd ~/infoMind
docker compose up -d --build
```

如果 `~/infoMind` 里没有 `docker-compose.yml`，通常是因为本地新增的部署文件还没有提交并推送到 GitHub。需要在本地提交并推送这些文件，或者直接把部署文件同步到服务器：

```bash
rsync -av Dockerfile docker-compose.yml .dockerignore .env.production.example deploy/ user@SERVER:~/infoMind/
```

同步后再回到服务器执行：

```bash
cd ~/infoMind
cp .env.production.example .env.production
docker compose up -d --build
```

## HTTPS 反向代理

推荐用 Caddy，配置最少：

```caddyfile
infomind.example.com {
  reverse_proxy 127.0.0.1:3456
}
```

把 `infomind.example.com` 替换成你的域名。

当前 `docker-compose.yml` 只把服务暴露到服务器本机 `127.0.0.1:3456`。除非你明确知道风险，否则不要直接把 InfoMind 端口暴露到公网。

## Hermes Agent 接入

在同一台服务器上安装 Hermes：

```bash
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
hermes setup
```

安装 InfoMind Skill：

```bash
mkdir -p ~/.hermes/skills/infomind
cp ~/infoMind/deploy/hermes/infomind/SKILL.md ~/.hermes/skills/infomind/SKILL.md
echo 'INFOMIND_BASE_URL=http://127.0.0.1:3456' >> ~/.hermes/.env
```

日常使用时，让 Hermes 负责：

- 把阅读链接保存到 InfoMind；
- 制定计划前先搜索已有收藏；
- 通过 `/api/stats`、`/api/entries`、`/api/books` 生成每日阅读计划；
- 通过飞书/Lark 网关把计划和提醒发到指定会话。

## 飞书/Lark 消息渠道

在飞书开放平台创建应用，启用机器人，并保存 App ID 和 App Secret。

推荐使用 Hermes 的网关配置命令：

```bash
hermes gateway setup
```

选择 Feishu/Lark，并优先选择 WebSocket 模式。对应的 `.env` 配置大致如下：

```bash
FEISHU_APP_ID=cli_xxx
FEISHU_APP_SECRET=secret_xxx
FEISHU_DOMAIN=feishu
FEISHU_CONNECTION_MODE=websocket
FEISHU_ALLOWED_USERS=ou_xxx
FEISHU_HOME_CHANNEL=oc_xxx
```

启动并安装网关：

```bash
hermes gateway
hermes gateway install
```

在飞书里，把机器人加入你希望接收每日计划和提醒的会话，然后发送：

```text
/set-home
```

这样 Hermes 就会把默认消息发送到该飞书会话。

## 备份策略

建议每天备份一次服务器上的 `data/` 目录。备份前先做 SQLite checkpoint：

```bash
mkdir -p ~/backups
cd ~/infoMind
docker compose exec -T infomind node -e "const Database=require('better-sqlite3'); const db=new Database('/app/data/infomind.db'); db.pragma('wal_checkpoint(TRUNCATE)'); db.close();"
tar -czf ~/backups/infomind-data-$(date +%Y%m%d-%H%M%S).tgz data
```

至少保留最近 7 天备份。确认备份和恢复流程稳定后，再考虑接入对象存储或自动清理脚本。
