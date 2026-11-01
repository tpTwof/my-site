"""管理端登录/登出接口。

会话令牌放在 **httpOnly Cookie** 里，前端 JS 读不到，降低 XSS 窃取风险；
Cookie 名与属性见 `COOKIE_NAME`。所有 `/api/admin/*` 通过 `require_auth` 校验。
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from sqlmodel import Session

from crud import auth as auth_crud
from config import admin_username
from database import get_session

router = APIRouter(prefix="/api/auth", tags=["auth"])

COOKIE_NAME = "tp_admin"


def _cookie_kwargs(request: Request) -> dict:
    """线上走 HTTPS 时给 Cookie 加 Secure。"""
    secure = request.url.scheme == "https" or request.headers.get("x-forwarded-proto") == "https"
    return {
        "key": COOKIE_NAME,
        "httponly": True,
        "samesite": "lax",
        "secure": secure,
        "path": "/",
    }


class LoginBody(BaseModel):
    username: str = Field(min_length=1, max_length=128)
    password: str = Field(min_length=1, max_length=256)


class MeResponse(BaseModel):
    username: str


def require_auth(request: Request, session: Session = Depends(get_session)) -> str:
    """受保护路由的依赖：校验 Cookie 里的会话，返回用户名。

    前端一律按 401 处理（跳登录页），因此不区分“没带令牌”和“令牌失效”。
    """
    token = request.cookies.get(COOKIE_NAME, "")
    record = auth_crud.get_valid_session(session, token)
    if record is None:
        raise HTTPException(
            status_code=401,
            detail="未登录或登录已过期",
            headers={"WWW-Authenticate": "Cookie"},
        )
    return admin_username()


@router.post("/login", response_model=MeResponse)
def login(
    body: LoginBody,
    request: Request,
    response: Response,
    session: Session = Depends(get_session),
):
    """用户名口令校验通过后签发会话，并把令牌写入 httpOnly Cookie。

    连续失败达到阈值会锁定账号（按账号计数，与 IP 无关），
    锁定期内直接返回 429，不再校验口令。
    """
    key = body.username.strip()

    try:
        auth_crud.ensure_not_locked(session, key)
    except auth_crud.LockedOut as exc:
        raise HTTPException(
            status_code=429,
            detail=f"尝试次数过多，请 {exc.retry_after // 60 + 1} 分钟后再试",
            headers={"Retry-After": str(exc.retry_after)},
        ) from exc

    if not auth_crud.verify_credentials(body.username, body.password):
        remaining = auth_crud.MAX_FAILURES - auth_crud.record_failure(session, key)
        # 不透露是账号错还是口令错
        detail = "账号或密码错误"
        if 0 < remaining <= 2:
            detail = f"账号或密码错误，还可尝试 {remaining} 次"
        raise HTTPException(status_code=401, detail=detail)

    auth_crud.clear_failures(session, key)

    token, record = auth_crud.create_session(session)
    response.set_cookie(
        value=token,
        max_age=int((record.expires_at - record.created_at).total_seconds()),
        **_cookie_kwargs(request),
    )
    # 返回**配置中的**用户名，而不是请求体里回显的字符串
    return MeResponse(username=admin_username())


@router.post("/logout", status_code=204)
def logout(
    request: Request,
    response: Response,
    session: Session = Depends(get_session),
):
    """注销当前会话并清除 Cookie。即使未登录也返回 204（幂等）。"""
    token = request.cookies.get(COOKIE_NAME, "")
    if token:
        auth_crud.revoke_session(session, token)
    # 必须写回注入的 response 才能带上 Set-Cookie；
    # 之前这里 return 了一个新的 Response，delete_cookie 的头被丢弃，
    # 浏览器端 Cookie 会一直残留。
    response.delete_cookie(**_cookie_kwargs(request))
    response.status_code = 204
    return None


@router.get("/me", response_model=MeResponse)
def me(username: str = Depends(require_auth)):
    """前端启动时用来判断是否已登录。未登录返回 401。"""
    return MeResponse(username=username)