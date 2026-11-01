#!/bin/bash
# 在 nginx.conf 的 http 块里加入限流区定义

CONF=/etc/nginx/nginx.conf

if grep -q "limit_req_zone.*zone=login" "$CONF"; then
  echo "已存在，跳过"
  exit 0
fi

echo '123456' | sudo -S python3 - <<'PYEOF' 2>/dev/null
from pathlib import Path

p = Path("/etc/nginx/nginx.conf")
text = p.read_text()

# 限流区必须定义在 http 块内、server 之外。
# 放在 include sites-enabled 之前，确保 server 能引用到。
marker = "    ##\n    # Virtual Host Configs"
zone = """
    # 登录接口限流：按客户端 IP，每分钟 5 次，允许突发 3 次
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
    # 全站 API 限流：每分钟 120 次，防止爬取
    limit_req_zone $binary_remote_addr zone=api:10m rate=120r/m;

"""
if marker in text:
    text = text.replace(marker, zone + marker, 1)
elif "include /etc/nginx/sites-enabled" in text:
    text = text.replace(
        "    include /etc/nginx/sites-enabled/",
        zone + "    include /etc/nginx/sites-enabled/",
        1,
    )
else:
    raise SystemExit("找不到插入位置，请手动编辑")

p.write_text(text)
print("已写入限流区")
PYEOF

echo "=== 检查 ==="
grep -n "limit_req_zone" "$CONF"