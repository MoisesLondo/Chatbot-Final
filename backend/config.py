import os
from dotenv import load_dotenv

load_dotenv()


GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
CONNECTION_STRING = os.getenv("CONNECTION_STRING")
