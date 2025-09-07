from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import MessagesPlaceholder
from langchain_postgres import PostgresChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts.chat import ChatPromptTemplate
import psycopg
from .tools import tools
import os
from dotenv import load_dotenv
from config import GOOGLE_API_KEY, SYSTEM_PROMPT
from typing import Dict, Any, List

load_dotenv()

def get_gemini_llm():
    """Se inicializa y devuelve el modelo ChatGoogleGenerativeAI."""
    return ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        temperature=0.2,
        max_retries=2,
        api_key=GOOGLE_API_KEY
    )

def get_session_history(session_id: str) -> PostgresChatMessageHistory:
    """Establece una conexión con la base de datos PostgreSQL para el historial de chat."""
    try:
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
    except Exception as e:
        print(f"Error connecting to PostgreSQL: {e}")
        raise


# --- Configuración del Agente ---

def get_gemini_agent_with_memory(session_id: str):
    """
    Crea y devuelve un agente LangChain con memoria que puede utilizar herramientas definidas.
    """
    llm = get_gemini_llm()

    # El prompt del agente necesita incluir marcadores de posición para las herramientas y el historial de chat
    # create_tool_calling_agent espera tipos de mensajes específicos para el historial
    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", SYSTEM_PROMPT),
            MessagesPlaceholder("chat_history"),
            ("human", "{input}"),
            MessagesPlaceholder("agent_scratchpad"),
        ]
    )

    # Crear el agente con las herramientas y el prompt
    agent = create_tool_calling_agent(llm, tools, prompt)

    # Crear el AgentExecutor
    agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

    # Agente con historial
    chain_with_history = RunnableWithMessageHistory(
        agent_executor,
        get_session_history,
        input_messages_key="input",
        history_messages_key="chat_history",
        get_session_history_key="session_id",
    )

    return chain_with_history

def get_chat_history(session_id: str) -> Dict[str, Any]:
    """Obtiene el historial de chat para una sesión dada."""
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
