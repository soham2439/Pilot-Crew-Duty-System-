import os
from typing import Optional, TypedDict

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from langgraph.graph import END, StateGraph

try:
    from langchain_openai import ChatOpenAI
except Exception:  # pragma: no cover
    ChatOpenAI = None


class ChatRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=4000)
    context: Optional[str] = Field(default=None, max_length=4000)


class ChatResponse(BaseModel):
    response: str


class ChatState(TypedDict):
    prompt: str
    context: Optional[str]
    response: str


def build_graph():
    def generate_response(state: ChatState) -> ChatState:
        prompt = state["prompt"]
        context = state.get("context")

        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key or ChatOpenAI is None:
            # Safe fallback so API remains testable without an LLM key.
            fallback = "AI service is live (LangGraph pipeline active). "
            state["response"] = fallback + f"Prompt received: {prompt[:180]}"
            return state

        model = ChatOpenAI(model="gpt-4o-mini", temperature=0.2)
        final_prompt = (
            "You are an aviation crew duty assistant. Keep replies concise and operational.\n"
            f"Context: {context or 'N/A'}\n"
            f"User Prompt: {prompt}"
        )
        ai_reply = model.invoke(final_prompt)
        state["response"] = ai_reply.content if isinstance(ai_reply.content, str) else str(ai_reply.content)
        return state

    graph = StateGraph(ChatState)
    graph.add_node("generate_response", generate_response)
    graph.set_entry_point("generate_response")
    graph.add_edge("generate_response", END)
    return graph.compile()


app = FastAPI(title="Pilot Crew LangGraph Service", version="1.0.0")
workflow = build_graph()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    try:
        result = workflow.invoke(
            {"prompt": request.prompt, "context": request.context, "response": ""}
        )
        return ChatResponse(response=result.get("response", "No response generated."))
    except Exception as ex:  # pragma: no cover
        raise HTTPException(status_code=500, detail=str(ex))
