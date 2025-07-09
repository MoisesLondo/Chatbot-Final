from fastapi import FastAPI
from pydantic import BaseModel
from gemini_chain import get_gemini_chain_with_memory

app = FastAPI()


class Question(BaseModel):
    query: str
    session_id: str

@app.post("/ask")
def ask_question(q: Question):
    try:
        chain = get_gemini_chain_with_memory(q.session_id)
        response = chain.invoke(q.query)
        final_response = response["response"] if isinstance(response, dict) and "response" in response else response
        return {
            "input": q.query,
            "response": final_response
        }
    except Exception as e:
        print(f"Error: {e}")
        return {"error": str(e)}
