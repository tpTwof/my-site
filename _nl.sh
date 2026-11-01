#!/bin/bash
# 鍦?nginx.conf 鐨?http 鍧楅噷鍔犲叆闄愭祦鍖哄畾涔?
CONF=/etc/nginx/nginx.conf

if grep -q "limit_req_zone.*zone=login" "$CONF"; then
  echo "宸插瓨鍦紝璺宠繃"
  exit 0
fi

echo '123456' | sudo -S python3 - <<'PYEOF' 2>/dev/null
from pathlib import Path

p = Path("/etc/nginx/nginx.conf")
text = p.read_text()

# 闄愭祦鍖哄繀椤诲畾涔夊湪 http 鍧楀唴銆乻erver 涔嬪銆?# 鏀惧湪 include sites-enabled 涔嬪墠锛岀‘淇?server 鑳藉紩鐢ㄥ埌銆?marker = "    ##\n    # Virtual Host Configs"
zone = """
    # 鐧诲綍鎺ュ彛闄愭祦锛氭寜瀹㈡埛绔?IP锛屾瘡鍒嗛挓 5 娆★紝鍏佽绐佸彂 3 娆?    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
    # 鍏ㄧ珯 API 闄愭祦锛氭瘡鍒嗛挓 120 娆★紝闃叉鐖彇
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
    raise SystemExit("鎵句笉鍒版彃鍏ヤ綅缃紝璇锋墜鍔ㄧ紪杈?)

p.write_text(text)
print("宸插啓鍏ラ檺娴佸尯")
PYEOF

echo "=== 妫€鏌?==="
grep -n "limit_req_zone" "$CONF"