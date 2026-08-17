from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class IngestRequest(BaseModel):
    chunk_size: int = 1000
    chunk_overlap: int = 200
    collection_name: str = "default_collection"
    metadata: Optional[Dict[str, Any]] = None

class RetrieveRequest(BaseModel):
    query: str
    collection_name: str = "default_collection"
    top_k: int = 4

class RetrieveResponse(BaseModel):
    content: str
    metadata: Optional[Dict[str, Any]] = None
    score: float

class IngestResponse(BaseModel):
    status: str
    message: str
    chunks_processed: int
    collection_name: str
