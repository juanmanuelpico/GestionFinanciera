# app/chains/rag.py
# Pipeline RAG adaptada de rag-chat-static/chat.py al servidor:
#   Pregunta -> Embedding -> Busqueda en ChromaDB (top-k) -> Contexto + Prompt -> LLM -> Respuesta
#
# Si todavia no se corro la ingesta (no existe data/chroma_db), el servicio
# responde igual usando solo el LLM: asi el endpoint /chat funciona desde el dia 1.

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate

from app.config import settings
from app.core.llm import get_llm
from app.core.vectorstore import get_vectorstore, vectorstore_exists

# Template del prompt: le decimos al LLM que use SOLO el contexto que le damos
# {context} se reemplaza con los fragmentos recuperados de ChromaDB
# {question} se reemplaza con la pregunta del usuario
PROMPT_TEMPLATE = """Eres el asistente de Gestion Financiera. Respondes preguntas usando exclusivamente el contexto proporcionado.

Contexto:
{context}

Pregunta: {question}

Respuesta util y precisa basada en el contexto:"""


def format_docs(docs):
    # Convierte la lista de Documentos recuperados en un solo string
    # separado por doble salto de linea para que el LLM lo entienda bien
    return "\n\n".join(d.page_content for d in docs)


def answer_question(question: str) -> dict:
    """Responde una pregunta y devuelve dict(answer, used_rag, sources).

    En la version LCEL de la referencia el chain se arma con el operador |
    (retriever | format_docs, prompt, llm, StrOutputParser). Acá se separa la
    recuperacion para poder reportar las fuentes en la respuesta HTTP sin
    buscar dos veces en la base vectorial.
    """
    prompt = ChatPromptTemplate.from_template(PROMPT_TEMPLATE)
    llm_chain = prompt | get_llm() | StrOutputParser()

    if vectorstore_exists():
        # El retriever trae los fragmentos mas similares a la pregunta (top-k)
        retriever = get_vectorstore().as_retriever(search_kwargs={"k": settings.top_k})
        docs = retriever.invoke(question)
        answer = llm_chain.invoke(
            {"context": format_docs(docs), "question": question}
        )
        return {
            "answer": answer,
            "used_rag": True,
            "sources": [d.metadata.get("source", "contexto") for d in docs],
        }

    # Sin ingesta todavia: respuesta directa del LLM
    return {"answer": llm_chain.invoke({"context": "(sin base vectorial)", "question": question}), "used_rag": False, "sources": []}
