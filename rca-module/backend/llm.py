import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq

load_dotenv()


class LLMConfigError(Exception):
    """Raised when the Groq API key is missing."""


def get_llm(json_mode: bool = True) -> ChatGroq:
    key = os.getenv("GROQ_API_KEY", "")
    if not key or key.startswith("gsk_paste"):
        raise LLMConfigError(
            "GROQ_API_KEY is missing. Put your real key in the .env file and restart the server."
        )
    extra = {"response_format": {"type": "json_object"}} if json_mode else {}
    return ChatGroq(
        model=os.getenv("GROQ_MODEL", "openai/gpt-oss-120b"),
        temperature=0,  # 0 = careful and consistent, not creative
        api_key=key,
        max_retries=2,
        model_kwargs=extra,
    )