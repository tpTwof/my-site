"""Bounded in-memory static bundles. Never extract user archives to disk."""
import io
import re
import stat
import zipfile
from pathlib import PurePosixPath

MAX_UPLOAD = 10 * 1024 * 1024
MAX_EXPANDED = 25 * 1024 * 1024
MAX_FILES = 200
MIME = {
    '.html': 'text/html', '.htm': 'text/html', '.css': 'text/css',
    '.js': 'text/javascript', '.json': 'application/json',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
    '.ttf': 'font/ttf', '.txt': 'text/plain', '.md': 'text/plain',
}


def safe_path(path: str) -> str:
    if (not path or path.startswith('/') or '\\' in path
            or any(c in path for c in ':?#%') or any(ord(c) < 32 for c in path)
            or any(p in ('', '.', '..') for p in path.split('/'))):
        raise ValueError('资源路径不合法')
    if PurePosixPath(path).suffix.lower() not in MIME:
        raise ValueError(f'不支持的静态文件：{path}')
    return path


def parse_package(data: bytes, filename: str) -> dict[str, bytes]:
    if len(data) > MAX_UPLOAD:
        raise ValueError('上传文件不能超过 10 MiB')
    if filename.lower().endswith(('.html', '.htm')):
        files = {'index.html': data}
    elif filename.lower().endswith('.zip'):
        try:
            with zipfile.ZipFile(io.BytesIO(data)) as archive:
                entries = archive.infolist()
                if len(entries) > MAX_FILES * 2:
                    raise ValueError('ZIP 条目过多')
                files = {}
                total = 0
                for item in entries:
                    if item.is_dir():
                        continue
                    path = safe_path(item.filename)
                    if item.flag_bits & 1 or stat.S_ISLNK(item.external_attr >> 16):
                        raise ValueError('不允许加密文件或软链接')
                    if path in files:
                        raise ValueError('ZIP 含有重复路径')
                    total += item.file_size
                    if total > MAX_EXPANDED or len(files) >= MAX_FILES:
                        raise ValueError('ZIP 解压后不能超过 25 MiB 或 200 个文件')
                    files[path] = archive.read(item)
        except (zipfile.BadZipFile, RuntimeError, NotImplementedError, OSError) as exc:
            raise ValueError('ZIP 无法读取，请重新打包') from exc
        if 'index.html' not in files and files:
            roots = {p.split('/')[0] for p in files}
            if len(roots) == 1 and all('/' in p for p in files):
                files = {p.split('/', 1)[1]: content for p, content in files.items()}
    else:
        raise ValueError('请选择 HTML 或 ZIP 文件')
    if 'index.html' not in files:
        raise ValueError('ZIP 根目录需要 index.html（也可放在唯一的一层目录中）')
    try:
        html = files['index.html'].decode('utf-8-sig')
    except UnicodeDecodeError as exc:
        raise ValueError('入口 HTML 必须使用 UTF-8 编码') from exc
    if not re.search(r'<(?:!doctype\s+html|html|body)\b', html, re.I):
        raise ValueError('入口需要完整的 HTML 文档')
    return files
