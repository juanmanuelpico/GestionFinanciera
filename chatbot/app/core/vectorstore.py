# app/core/vectorstore.py
# Base vectorial ChromaDB persistente (data/chroma_db), generada con scripts/ingest.py.

from functools import lru_cache

from langchain_chroma import Chroma

from app.config import settings
from app.core.embeddings import get_embeddings


def vectorstore_exists() -> bool:
    """True si ya se corrió la ingesta (existe la base persistida en disco)."""
    return (settings.chroma_dir / "chroma.sqlite3").exists()


@lru_cache(maxsize=1)
def get_vectorstore() -> Chroma:
    """Carga ChromaDB desde el disco con la función de embedding compartida."""
    return Chroma(
        embedding_function=get_embeddings(),
        persist_directory=str(settings.chroma_dir),
    )
