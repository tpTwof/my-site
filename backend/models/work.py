from datetime import datetime
from typing import Literal

from pydantic import Field as SchemaField, field_validator
from sqlalchemy import Column, LargeBinary
from sqlmodel import Field, SQLModel

from models.post import generate_uuid, utcnow


class Work(SQLModel, table=True):
    __tablename__ = 'works'
    id: str = Field(default_factory=generate_uuid, primary_key=True)
    slug: str = Field(unique=True, index=True)
    title: str
    description: str = ''
    category: str = 'explainer'
    tags: str = ''
    status: str = 'draft'
    featured: bool = False
    file_count: int = 0
    package_size: int = 0
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class WorkFile(SQLModel, table=True):
    __tablename__ = 'work_files'
    work_id: str = Field(primary_key=True, foreign_key='works.id')
    path: str = Field(primary_key=True)
    content: bytes = Field(sa_column=Column(LargeBinary, nullable=False))


class ContentImport(SQLModel, table=True):
    __tablename__ = 'content_imports'
    key: str = Field(primary_key=True)


class WorkPreview(SQLModel, table=True):
    __tablename__ = 'work_previews'
    token_hash: str = Field(primary_key=True)
    work_id: str = Field(index=True)
    session_hash: str
    expires_at: datetime = Field(index=True)


class WorkInput(SQLModel):
    title: str = Field(min_length=1, max_length=160)
    slug: str = SchemaField(min_length=1, max_length=100, pattern=r'^[a-z0-9]+(?:-[a-z0-9]+)*$')
    description: str = Field(default='', max_length=1000)
    category: Literal['explainer', 'experiment', 'project'] = 'explainer'
    tags: str = Field(default='', max_length=200)
    status: Literal['draft', 'published'] = 'draft'
    featured: bool = False

    @field_validator('title')
    @classmethod
    def title_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError('标题不能为空')
        return value.strip()


class WorkView(WorkInput):
    id: str
    file_count: int
    package_size: int
    created_at: datetime
    updated_at: datetime
