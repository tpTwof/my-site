"""数据库连接。

DATABASE_URL 来自 config（环境变量或 backend/.env），默认值是相对**当前工作
目录**的 blog.db。部署时（systemd）建议给绝对路径，避免工作目录变化导致连到
另一个空库。
"""

from sqlmodel import SQLModel, Session, create_engine

from config import DATABASE_URL

engine = create_engine(
    DATABASE_URL,
    echo=False,
    # 允许在 TestClient / 多线程里共用同一连接池
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)


def init_db():
    """创建所有表（仅当表不存在时）"""
    # 确保模型被导入，否则 metadata 里没有表
    import models.admin_session  # noqa: F401
    import models.login_attempt  # noqa: F401
    import models.post  # noqa: F401
    import models.tag  # noqa: F401
    import routers.journey  # noqa: F401

    SQLModel.metadata.create_all(engine)


def get_session():
    """FastAPI 依赖注入：提供数据库 session"""
    with Session(engine) as session:
        yield session
