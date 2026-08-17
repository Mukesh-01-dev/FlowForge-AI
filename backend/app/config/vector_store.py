from qdrant_client import QdrantClient
from langchain_qdrant import QdrantVectorStore
from langchain_google_genai import GoogleGenerativeAIEmbeddings
import os
from dotenv import load_dotenv

load_dotenv()

# Initialize Qdrant Client (running locally on disk to avoid needing Docker)
qdrant_client = QdrantClient(path="./qdrant_data")

# Initialize embeddings
# Assuming GEMINI_API_KEY is in the environment
embeddings = GoogleGenerativeAIEmbeddings(model="models/text-embedding-004", google_api_key=os.getenv("GEMINI_API_KEY"))

def get_vector_store(collection_name: str):
    """
    Returns a LangChain Qdrant vector store instance for a given collection.
    """
    return QdrantVectorStore(
        client=qdrant_client,
        collection_name=collection_name,
        embedding=embeddings
    )
