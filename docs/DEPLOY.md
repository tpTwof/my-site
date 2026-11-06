# 部署说明（阿里云 Ubuntu + nginx + systemd）

目标：`https://www.tptwof.top` 单机部署，同域架构——nginx 托管前端静态文件，
并把 `/api` 反代到本机 FastAPI。这样没有跨域问题，httpOnly Cookie 直接可用。

---

## 本地开发（先看这个）

### 启动

```powershell
# 后端
cd backend
.venv\Scripts\uvicorn.exe main:app --reload

# 前端
cd frontend
npm run dev
```

浏览器访问 `http://localhost:5173` 或 `http://127.0.0.1:5173` 都可以。

如果启动后登录一直失败，检查终端里是否残留旧的 `ADMIN_*` 环境变量
（`$env:ADMIN_USERNAME` / `$env:ADMIN_PASSWORD_HASH`）。`config.py` 里
`.env` 会覆盖环境变量，所以正常情况下 `.env` 一定生效；但仍建议在干净
终端里启动。

### 为什么两个 host 都行

前端一律请求相对路径 `/api/...`，由 Vite 的 `server.proxy` 转发到后端：

```
页面 http://localhost:5173  →  /api/...  →  (代理)  →  http://127.0.0.1:8000
```

页面与 API 同源，登录 Cookie 的域始终匹配。生产环境由 nginx 做同样的事，
所以本地与生产**行为一致，都不需要配置后端地址**。

> 早期版本让前端直连 `http://127.0.0.1:8000`，导致 `localhost:5173` 页面
> 与 API 跨站，`SameSite=Lax` 的登录 Cookie 不发送，表现为「登录成功又弹回
> 登录页」。代理方案根治了这一点。

### 口令配置

配置读环境变量，也读 `backend/.env`。本地用文件，**不要**在终端里手敲哈希
——口令里的 `@`、`$`、`!` 会被 PowerShell 解析，算出来的哈希对不上。

```powershell
cd backend
copy .env.example .env
```

生成哈希（`getpass` 会提示输入，内容不经 shell 解析）：

```powershell
.venv\Scripts\python.exe -c "import hashlib,getpass;print(hashlib.sha256(getpass.getpass('密码: ').encode()).hexdigest())"
```

把输出的 64 位十六进制粘进 `.env` 的 `ADMIN_PASSWORD_HASH=`。

启动时终端会打印一行摘要，确认进程读到了什么：

```
[config] 来源=文件 ...\backend\.env | ADMIN_USERNAME=tptwo | ADMIN_PASSWORD_HASH=已设置(64 位) | DATABASE_URL=sqlite:///./blog.db
```

`.env` 已列入 `.gitignore`，不会进仓库。

---

## 服务器布局

| 路径 | 用途 |
|------|------|
| `/srv/tptwo/app/` | 代码（git clone） |
| `/srv/tptwo/venv/` | Python 虚拟环境 |
| `/srv/tptwo/data/blog.db` | SQLite 数据库（**备份这个文件就等于备份全部内容**） |
| `/etc/tptwo/env` | 环境变量（含口令哈希，权限 600） |
| `/var/www/tptwo/` | 前端构建产物（nginx 直接读） |

---

## 一、环境变量

`/etc/tptwo/env`（`chmod 600`，属主 root）：

```bash
# 数据库用绝对路径，避免工作目录变化后连到另一个空库
DATABASE_URL=sqlite:////srv/tptwo/data/blog.db

# 管理员账号
ADMIN_USERNAME=tptwo

# 口令的 SHA-256 十六进制摘要（不要写明文口令）
# 生成： python3 -c "import hashlib,getpass;print(hashlib.sha256(getpass.getpass('密码: ').encode()).hexdigest())"
ADMIN_PASSWORD_HASH=<替换为你的哈希>

# 会话有效期（小时），默认 168 = 7 天
AUTH_SESSION_TTL_HOURS=168

# 同域部署时不需要 CORS；如需跨域再填，逗号分隔
CORS_ORIGINS=https://www.tptwof.top
```

> `config.py` 启动时读取 `backend/.env` 并**覆盖**同名环境变量（`.env` 是唯一
> 真相来源）。服务器上不创建 `.env` 文件，`load_dotenv` 找不到文件即什么都不做，
> 因此 systemd 的 `EnvironmentFile` 注入的变量原样生效。
>
> 反过来要注意：**若服务器上误留了一份 `.env`，它会盖掉 `/etc/tptwo/env`**。
> 排查配置问题时先确认 `backend/.env` 不存在。

> **注意 `DATABASE_URL` 中的四个斜杠**：`sqlite:///` + 绝对路径 `/srv/...`
> 才是 `sqlite:////srv/tptwo/data/blog.db`。

---

## 二、systemd 服务

`/etc/systemd/system/tptwo.service`：

```ini
[Unit]
Description=tpTwo blog API
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/srv/tptwo/app/backend
EnvironmentFile=/etc/tptwo/env
ExecStart=/srv/tptwo/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000 --workers 2
Restart=always
RestartSec=3

# 加固
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=/srv/tptwo/data

[Install]
WantedBy=multi-user.target
```

启用：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now tptwo
sudo systemctl status tptwo
```

---

## 三、nginx

`/etc/nginx/sites-available/tptwo`：

```nginx
server {
    listen 80;
    server_name www.tptwof.top tptwof.top;

    root /var/www/tptwo;
    index index.html;

    # 反代 API。注意带上 X-Forwarded-Proto，后端据此决定 Cookie 是否加 Secure
    location /api/ {
        # 路程图片以 JSON data URL 上传（原图最大 2MB），为 base64 留出余量
        client_max_body_size 4m;
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 带哈希的静态资源可长期缓存
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA 回退：其余路径都交给 index.html，由 React Router 处理
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/tptwo /etc/nginx/sites-enabled/tptwo
sudo nginx -t && sudo systemctl reload nginx
```

### HTTPS

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d tptwof.top -d www.tptwof.top
```

certbot 会自动改写上面的 server 块加入 443 与跳转。签发成功后 Cookie 会自动带上
`Secure`（后端按 `X-Forwarded-Proto` 判断）。

---

## 四、发版

```bash
cd /srv/tptwo/app && sudo -u www-data git pull
sudo -u www-data /srv/tptwo/venv/bin/pip install -r backend/requirements.txt -q
sudo -u www-data bash -c 'cd frontend && npm ci && npm run build'
sudo rsync -a --delete frontend/dist/ /var/www/tptwo/
sudo systemctl restart tptwo
```

前端一律请求相对路径 `/api/...`，无需配置后端地址，也无需设置 `VITE_API_BASE`。

---

## 五、验证清单

```bash
# 1. 公开接口可用
curl -s https://www.tptwof.top/api/home

# 2. 管理接口未登录必须 401
curl -s -o /dev/null -w '%{http_code}\n' https://www.tptwof.top/api/admin/posts
# 期望：401

# 3. 登录并拿到 Cookie
curl -s -c /tmp/c.txt -X POST https://www.tptwof.top/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"tptwo","password":"你的口令"}'
# 期望：{"username":"tptwo"}

# 4. 带 Cookie 访问管理接口
curl -s -b /tmp/c.txt https://www.tptwof.top/api/admin/posts | head -c 120

# 5. Cookie 属性检查
grep tp_admin /tmp/c.txt
```

浏览器侧：访问 `/admin/posts` 应跳转登录页；登录后回到列表；点「登出」后
再访问管理页又回到登录页。

---

## 六、改密码

1. 生成新哈希，更新 `/etc/tptwo/env` 的 `ADMIN_PASSWORD_HASH`
2. 清空所有旧会话（否则旧设备的 Cookie 仍然有效）：
   ```bash
   sudo -u www-data /srv/tptwo/venv/bin/python -c "
   import sys; sys.path.insert(0,'/srv/tptwo/app/backend')
   from database import engine; from sqlmodel import Session, select
   from models.admin_session import AdminSession
   with Session(engine) as db:
       [db.delete(r) for r in db.exec(select(AdminSession)).all()]; db.commit()
   print('sessions cleared')"
   ```
3. `sudo systemctl restart tptwo`

---

## 七、备份

```bash
# 数据库（全部内容都在这里）
sqlite3 /srv/tptwo/data/blog.db ".backup '/srv/tptwo/data/backup-$(date +%F).db'"
```

建议加个每日 cron。因为 SQLite 是单文件，备份就是拷一份快照。
