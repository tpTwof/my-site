from sqlmodel import SQLModel, Session, create_engine

DATABASE_URL = "sqlite:///./blog.db"

engine = create_engine(DATABASE_URL, echo=False)


def init_db():
    """创建所有表（仅当表不存在时）"""
    SQLModel.metadata.create_all(engine)


def get_session():
    """FastAPI 依赖注入：提供数据库 session"""
    with Session(engine) as session:
        yield session
