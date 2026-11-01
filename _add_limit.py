from pathlib import Path

p = Path("/etc/nginx/nginx.conf")
text = p.read_text()

if "limit_req_zone" in text:
    print("already has limit_req_zone, skip")
    raise SystemExit(0)

anchor = "include /etc/nginx/conf.d/*.conf;"
if anchor not in text:
    print("ERROR: anchor not found")
    raise SystemExit(1)

lines = [
    "",
    "\t# rate limiting",
    "\tlimit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;",
    "\tlimit_req_zone $binary_remote_addr zone=api:10m rate=120r/m;",
    "",
    "\tlimit_req_status 429;",
    "",
]
zone = "\n".join(lines)

text = text.replace(anchor, zone + "\t" + anchor, 1)
p.write_text(text)
print("inserted")

for i, line in enumerate(text.splitlines(), 1):
    if "limit_req" in line:
        print("  %d: %s" % (i, line.strip()))