"""Helper: shows which Groq models YOUR key can use right now.
Run:  python check_models.py"""
import os
from dotenv import load_dotenv
from groq import Groq

load_dotenv()
print("GROQ_MODEL in .env :", os.getenv("GROQ_MODEL"))
key = os.getenv("GROQ_API_KEY", "")
print("Key found          :", "yes (starts with " + key[:4] + ")" if key else "NO - key missing")

client = Groq(api_key=key)
ids = sorted(m.id for m in client.models.list().data)
print("\nModels your key can use right now:")
for model_id in ids:
    print(" -", model_id)
