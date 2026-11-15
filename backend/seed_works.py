"""Import the reviewed starter once; never overwrite subsequent editorial decisions."""
from pathlib import Path

from sqlmodel import Session, select

from models.work import ContentImport, Work, WorkFile


def seed_works(session: Session):
    key = 'react-explainer-v1'
    if session.get(ContentImport, key):
        return
    existing = session.exec(select(Work).where(Work.slug == 'react-explained')).first()
    if not existing:
        directory = Path(__file__).parent / 'content' / 'react-explained'
        files = {p.name: p.read_bytes() for p in sorted(directory.iterdir()) if p.is_file()}
        work = Work(
            slug='react-explained', title='ReAct：模型怎样一步步解决问题',
            description='从推理、行动到观察，跟随一条真实运行记录，拆解模型与工具之间的协作。逐步回放、消息结构与循环代码，一起看懂 ReAct。',
            tags='AI, Agent, ReAct', category='explainer', status='published', featured=True,
            file_count=len(files), package_size=sum(map(len, files.values())),
        )
        session.add(work)
        session.flush()
        for path, content in files.items():
            session.add(WorkFile(work_id=work.id, path=path, content=content))
    session.add(ContentImport(key=key))
    session.commit()
