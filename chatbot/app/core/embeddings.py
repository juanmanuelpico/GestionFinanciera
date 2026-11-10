# app/core/embeddings.py
# Generador de embeddings compartido por ingesta y por chat.
# Necesitamos el MISMO modelo de embeddings para que los vectores guardados
# en ChromaDB sean compatibles con las búsquedas (igual que la referencia).

from functools import lru_cache

from langchain_huggingface import HuggingFaceEmbeddings

from app.config import settings


@lru_cache(maxsize=1)
def get_embeddings() -> HuggingFaceEmbeddings:
    """all-MiniLM-L6-v2 es un modelo liviano de Sentence Transformers (~80MB)."""
    return HuggingFaceEmbeddings(model_name=settings.embedding_model)
