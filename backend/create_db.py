from db.database import engine, Base
from models.users import User
from models.clients import Client
from models.conversation import Conversation
from models.messages import Message
from models.agent_config import AgentConfig
from models.leads import Lead
from models.lead_conversation import LeadConversation
from models.company_info import CompanyInfo

def create_database():
    Base.metadata.create_all(bind=engine)
    print("Database and tables created successfully.")

if __name__ == "__main__":
    create_database()