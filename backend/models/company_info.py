from sqlalchemy import TEXT, Column, Integer, String, Text, ForeignKey
from db.database import Base

class CompanyInfo(Base):
    __tablename__ = "company_info"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"),index=True, nullable=False)  # Foreign key to User.id
    company_name = Column(String(255), nullable=False)
    company_size = Column(String(50), nullable=False)
    location = Column(String(255), nullable=False)
    services = Column(Text, nullable=True)
    industry = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    website = Column(TEXT, nullable=True)