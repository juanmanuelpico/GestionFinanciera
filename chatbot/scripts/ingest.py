# scripts/ingest.py
# Convierte un archivo Markdown en una base de datos vectorial (ChromaDB),
# adaptado de rag-chat-static/ingest.py.
# Flujo: MD -> Texto -> Fragmentos (chunks) -> Vectores (embeddings) -> ChromaDB
#
# Uso (desde chatbot/):
#   python scripts/ingest.py <archivo.md>

import argparse
import sys
from pathlib import Path

# Permite importar el paquete app/ ejecutando el script desde cualquier carpeta
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# TextLoader: lee archivos de texto plano
from langchain_community.document_loaders import TextLoader

# RecursiveCharacterTextSplitter: divide el texto en fragmentos del mismo tamano
from langchain_text_splitters import RecursiveCharacterTextSplitter

# Chroma: base de datos vectorial que guarda y busca por similitud
from langchain_chroma import Chroma

from app.config import settings
from app.core.embeddings import get_embeddings


def main():
    # --- 1. RECIBIR EL ARCHIVO POR LINEA DE COMANDOS ---
    parser = argparse.ArgumentParser(description="Ingesta de MD a base vectorial ChromaDB")
    parser.add_argument("file", help="Ruta al archivo .md")
    args = parser.parse_args()

    if not Path(args.file).exists():
        print(f"Archivo no encontrado: {args.file}")
        return

    # --- 2. CARGAR EL DOCUMENTO ---
    loader = TextLoader(args.file, encoding="utf-8")
    docs = loader.load()

    # --- 3. DIVIDIR EN FRAGMENTOS (CHUNKING) ---
    # chunk_size: 500 caracteres por fragmento
    # chunk_overlap: 50 caracteres de solapamiento para no cortar ideas por la mitad
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
        separators=["\n## ", "\n### ", "\n", ". ", " "],
    )
    chunks = splitter.split_documents(docs)
    print(f"{len(chunks)} chunks generados desde {args.file}")

    # --- 4. GUARDAR EN CHROMADB (con los embeddings compartidos) ---
    settings.chroma_dir.mkdir(parents=True, exist_ok=True)
    Chroma.from_documents(
        documents=chunks,
        embedding=get_embeddings(),
        persist_directory=str(settings.chroma_dir),
    )
    print(f"Base vectorial guardada en {settings.chroma_dir}/")


if __name__ == "__main__":
    main()
