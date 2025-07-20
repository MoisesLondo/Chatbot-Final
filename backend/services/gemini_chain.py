# Archivo movido desde backend/gemini_chain.py
# Copia aquí el contenido original de gemini_chain.py

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import PromptTemplate
from langchain_postgres import PostgresChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory

import psycopg
import os
from dotenv import load_dotenv
from config import GOOGLE_API_KEY
from typing import Dict, Any

load_dotenv()

def get_gemini_llm():
    return ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        temperature=0.2,
        max_retries=2,
        api_key=GOOGLE_API_KEY
    )

def get_session_history(session_id: str) -> PostgresChatMessageHistory:
    sync_connection = psycopg.connect(
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT")
    )
    return PostgresChatMessageHistory(
        "chat_history",
        session_id,
        sync_connection=sync_connection
    )

def get_gemini_chain_with_memory(session_id: str):
    llm = get_gemini_llm()
    prompt = PromptTemplate(
        input_variables=["chat_history", "input"],
        template="""
Eres un asistente de una empresa distribuidora de hierro y materiales de construcción. Aquí está el historial de la conversación:
{chat_history}

Usuario: {input}
Asistente:"""
    )

    chain = prompt | llm

    chain_with_history = RunnableWithMessageHistory(
        chain,
        get_session_history,
        input_messages_key="input",
        history_messages_key="chat_history",
    )

    return chain_with_history

def get_chat_history(session_id: str) -> Dict[str, Any]:
    try:
        history = get_session_history(session_id)
        messages = [{
            "type": message.type,
            "content": message.content,
        } for message in history.messages]

        return {
            "session_id": session_id,
            "history": messages
        }
    except Exception as e:
        print(f"Error getting chat history: {e}")
        return {"error": str(e)}
# Archivo movido desde backend/gemini_chain.py
# Copia aquí el contenido original de gemini_chain.py
