from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, func

from core.database import Base


class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True)
    username = Column(String, index=True)
    password = Column(String)
    created_at = Column(DateTime, server_default=func.now())


class HideoutProgress(Base):
    __tablename__ = 'hideout_progress'

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    module_id = Column(String, index=True)
    collected_items = Column(JSON, default={})
    completed = Column(Integer, default=0)
