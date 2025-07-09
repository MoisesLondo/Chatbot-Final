from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.chains import ConversationChain
from langchain.memory import ConversationSummaryBufferMemory
from langchain_postgres import PostgresChatMessageHistory
import psycopg
import os
from dotenv import load_dotenv
from config import GOOGLE_API_KEY
load_dotenv()

def get_gemini_llm():
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        temperature=0.2,
        max_retries=2,
        api_key=GOOGLE_API_KEY
    )
    return llm

def get_gemini_chain_with_memory(session_id: str):
    llm = get_gemini_llm()
    summary_llm = get_gemini_llm()

    sync_connection = psycopg.connect(
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT")
    )

    history = PostgresChatMessageHistory(
        "chat_history",
        session_id, 
        sync_connection=sync_connection
    )

    memory = ConversationSummaryBufferMemory(
        llm=summary_llm,
        chat_memory=history,
        max_token_limit=200,
        return_messages=True
    )

    conversation_chain = ConversationChain(
        llm=llm,
        memory=memory,
        verbose=True
    )
    return conversation_chain