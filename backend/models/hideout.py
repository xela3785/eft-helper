from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, func

from core.database import Base


class HideoutProgress(Base):
    __tablename__ = 'hideout_progress'

    id = Column(Integer, primary_key=True)
    user_id = Column(
        Integer,
        ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    module_id = Column(String, index=True, nullable=False)
    current_level = Column(Integer, nullable=False)
    level_progress = Column(JSON, default={})

    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, nullable=False, onupdate=func.now())
