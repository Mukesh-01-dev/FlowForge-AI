import os
import tempfile
from typing import List, Dict, Any
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.config.vector_store import get_vector_store

class RAGService:
    @staticmethod
    def ingest_document(file_content: bytes, filename: str, chunk_size: int, chunk_overlap: int, collection_name: str, metadata: Dict[str, Any] = None) -> int:
        """
        Parses a document (PDF), splits it into chunks, and stores it in Qdrant.
        """
        # Save to temp file since PyPDFLoader requires a file path
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            temp_file.write(file_content)
            temp_path = temp_file.name

        try:
            # Load Document
            loader = PyPDFLoader(temp_path)
            docs = loader.load()

            # Add extra metadata if provided
            if metadata:
                for doc in docs:
                    doc.metadata.update(metadata)

            # Split Document
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
                length_function=len
            )
            chunks = text_splitter.split_documents(docs)

            # Get Vector Store
            vector_store = get_vector_store(collection_name)

            # Store in Qdrant
            vector_store.add_documents(chunks)
            
            return len(chunks)

        finally:
            # Cleanup temp file
            if os.path.exists(temp_path):
                os.remove(temp_path)

    @staticmethod
    def retrieve_context(query: str, collection_name: str, top_k: int = 4) -> List[Dict[str, Any]]:
        """
        Retrieves the most relevant document chunks for a given query.
        """
        vector_store = get_vector_store(collection_name)
        
        # Perform similarity search with scores
        docs_with_scores = vector_store.similarity_search_with_score(query, k=top_k)
        
        results = []
        for doc, score in docs_with_scores:
            results.append({
                "content": doc.page_content,
                "metadata": doc.metadata,
                "score": float(score)
            })
            
        return results
