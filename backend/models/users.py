from sqlalchemy import Column, Integer, String, DateTime, func, UniqueConstraint

from core.database import Base


class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True)
    email = Column(String, index=True, unique=True, nullable=False)
    hashed_password = Column(String, nullable=True)
    provider = Column(String, default='local')
    provider_id = Column(String, nullable=True, unique=True)
    created_at = Column(DateTime, server_default=func.now())


class UserSocialLink(Base):
    __tablename__ = 'user_social_links'

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False)
    provider = Column(String)
    provider_user_id = Column(String, nullable=False)
    access_token = Column(String, nullable=False)

    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        UniqueConstraint('provider', 'provider_user_id'),
    )