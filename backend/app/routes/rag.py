from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import List, Optional
import json

from app.models.rag_models import RetrieveRequest, RetrieveResponse, IngestResponse
from app.services.rag_service import RAGService

router = APIRouter(prefix="/rag", tags=["RAG"])

@router.post("/ingest", response_model=IngestResponse)
async def ingest_document(
    file: UploadFile = File(...),
    chunk_size: int = Form(1000),
    chunk_overlap: int = Form(200),
    collection_name: str = Form("default_collection"),
    metadata_json: Optional[str] = Form(None)
):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported currently")

    try:
        content = await file.read()
        
        parsed_metadata = None
        if metadata_json:
            parsed_metadata = json.loads(metadata_json)
            
        chunks_processed = await RAGService.ingest_document(
            file_content=content,
            filename=file.filename,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            collection_name=collection_name,
            metadata=parsed_metadata
        )
        
        return IngestResponse(
            status="success",
            message=f"Successfully ingested {file.filename}",
            chunks_processed=chunks_processed,
            collection_name=collection_name
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/retrieve", response_model=List[RetrieveResponse])
async def retrieve_context(request: RetrieveRequest):
    try:
        results = RAGService.retrieve_context(
            query=request.query,
            collection_name=request.collection_name,
            top_k=request.top_k
        )
        
        return [RetrieveResponse(**result) for result in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
