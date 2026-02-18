"""Resume RAG Worker — Cloudflare Python Worker with Vectorize.

User-based resume storage and retrieval with PDF upload support.
Features:
  ✓ LlamaParse for intelligent PDF parsing (OCR, tables, markdown)
  ✓ Workers AI embeddings (bge-base-en-v1.5, 768-dim)
  ✓ Vectorize storage with user-based namespacing
  ✓ RAG-powered chat using Llama 3.3 70B
  ✓ Base64 PDF upload (browser compatible)
"""

import json
import re
import base64
from datetime import datetime, timezone
from urllib.parse import urlparse
from typing import Any, Dict, List, Optional

# Pydantic imports
try:
    from pydantic.v1 import BaseModel, Field
except ImportError:
    from pydantic import BaseModel, Field

# Cloudflare Workers runtime
from workers import Response, WorkerEntrypoint


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

EMBED_MODEL = "@cf/baai/bge-base-en-v1.5"
EMBED_DIM = 768
CHUNK_SIZE = 800
CHUNK_OVERLAP = 200

# LlamaParse v2 settings
LLAMA_BASE = "https://api.cloud.llamaindex.ai/api/v2/parse"
MAX_PAGES = 20

_RESERVED_METADATA_KEYS = {"values", "id", "namespace"}
_MAX_METADATA_BYTES = 10_000


# ---------------------------------------------------------------------------
# Pydantic Models
# ---------------------------------------------------------------------------

class ResumeData(BaseModel):
    user_id: str = Field(description="User ID from auth")
    name: str = Field(description="Full name")
    summary: str = Field(description="Professional summary")
    experience: str = Field(description="Work experience")
    skills: List[str] = Field(default_factory=list)
    education: str = Field(default="")
    metadata: Dict[str, Any] = Field(default_factory=dict)

    def __init__(self, **data):
        """Initialize and validate metadata."""
        if "metadata" in data:
            data["metadata"] = self._sanitize_metadata(data["metadata"])
        super().__init__(**data)
    
    @staticmethod
    def _sanitize_metadata(v: Dict[str, Any]) -> Dict[str, Any]:
        """Strip reserved keys and cap total serialised size."""
        sanitized = {k: val for k, val in v.items()
                     if k not in _RESERVED_METADATA_KEYS}
        if len(json.dumps(sanitized).encode()) > _MAX_METADATA_BYTES:
            raise ValueError(
                f"metadata exceeds {_MAX_METADATA_BYTES} bytes after stripping reserved keys"
            )
        return sanitized


class SearchRequest(BaseModel):
    user_id: str = Field(description="User ID")
    query: str = Field(description="Search query")
    limit: int = Field(default=5, ge=1, le=50)
    resume_id: str = Field(default="latest")


class ChatRequest(BaseModel):
    user_id: str = Field(description="User ID")
    message: str = Field(description="User question")
    resume_id: str = Field(default="latest")


class PdfUploadRequest(BaseModel):
    user_id: str = Field(description="User ID")
    pdf_base64: str = Field(description="Base64 encoded PDF file")
    filename: str = Field(description="Original filename")


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def get_attr(obj, attr: str, default=None):
    """Safe attribute getter for JS proxy objects."""
    try:
        return getattr(obj, attr, default)
    except Exception:
        return default


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[str]:
    """Split text into overlapping chunks."""
    if not text:
        return []
    
    chunks = []
    start = 0
    text_len = len(text)
    
    while start < text_len:
        end = start + chunk_size
        chunk = text[start:end]
        
        if chunk:
            chunks.append(chunk.strip())
        
        start += chunk_size - overlap
        if start >= text_len:
            break
    
    return chunks if chunks else [text]


async def generate_embedding(ai_binding, text: str) -> List[float]:
    """Generate embeddings using Workers AI."""
    if not text or not text.strip():
        raise ValueError("Cannot generate embedding for empty text")
    
    from js import JSON as JsJSON
    from pyodide.ffi import to_js
    
    result = await ai_binding.run(
        EMBED_MODEL,
        to_js({"text": text}, dict_converter=lambda d: JsJSON.stringify(d))
    )
    
    result_json_str = JsJSON.stringify(result)
    result_dict = json.loads(result_json_str)
    
    if "data" not in result_dict or not result_dict["data"]:
        raise RuntimeError(f"Invalid embedding result: {result_dict}")
    
    embedding = result_dict["data"][0]
    if not isinstance(embedding, list) or len(embedding) != EMBED_DIM:
        raise RuntimeError(f"Expected {EMBED_DIM}-dim embedding, got {len(embedding)} dims")
    
    return embedding


def format_resume_text(resume: ResumeData) -> str:
    """Format resume data into searchable text."""
    parts = [
        f"Name: {resume.name}",
        f"Summary: {resume.summary}",
        f"Experience:\n{resume.experience}",
    ]
    
    if resume.skills:
        parts.append(f"Skills: {', '.join(resume.skills)}")
    
    if resume.education:
        parts.append(f"Education: {resume.education}")
    
    return "\n\n".join(parts)


def resume_namespace(user_id: str, resume_id: str = "latest") -> str:
    """Generate namespace for user resumes."""
    return f"resumes:{user_id}:{resume_id}"


def _extract_path(url: str) -> str:
    """Extract the last path segment from a URL, handling trailing slashes."""
    path = urlparse(url).path.rstrip("/")
    return path.rsplit("/", 1)[-1] if "/" in path else path


async def submit_pdf_to_llamaparse(pdf_bytes: bytes, filename: str, api_key: str) -> dict:
    """Submit PDF to LlamaParse v2 API. Returns job info immediately (fire-and-forget)."""
    from js import fetch as js_fetch, FormData, Blob, File as JSFile, Object as JSObject, Uint8Array
    from pyodide.ffi import to_js

    # Detect tier based on file size and name
    page_hint = max(1, len(pdf_bytes) // 50_000)
    name_lower = filename.lower()
    looks_complex = any(kw in name_lower for kw in ("scan", "ocr", "report", "invoice", "form"))
    tier = "cost_effective" if (looks_complex or page_hint > 10) else "fast"

    # v2 API: configuration goes as a JSON string in a `configuration` form field
    configuration = {
        "tier": tier,
        "version": "2025-12-11",
    }

    # Create FormData — Python bytes → JS Uint8Array → Blob → File
    form = FormData.new()
    blob_opts = to_js({"type": "application/pdf"}, dict_converter=JSObject.fromEntries)
    js_array = Uint8Array.new(pdf_bytes)
    blob = Blob.new(to_js([js_array]), blob_opts)
    file_obj = JSFile.new(to_js([blob]), filename, blob_opts)
    form.append("file", file_obj)
    form.append("configuration", json.dumps(configuration))

    # Submit to LlamaParse v2
    resp = await js_fetch(
        f"{LLAMA_BASE}/upload",
        to_js({
            "method": "POST",
            "headers": {"Authorization": f"Bearer {api_key}"},
            "body": form,
        }, dict_converter=JSObject.fromEntries),
    )

    body = await resp.text()
    if not resp.ok:
        raise RuntimeError(f"LlamaParse upload failed: {resp.status} {body[:300]}")

    result = json.loads(body)
    return {"job_id": result["id"], "tier": tier}


async def fetch_llamaparse_result(job_id: str, api_key: str) -> dict:
    """Check LlamaParse v2 job status. Returns {status, text?, metadata?}."""
    from js import fetch as js_fetch, Object as JSObject
    from pyodide.ffi import to_js

    # Step 1: Check job status (no expand to avoid FAST tier error)
    resp = await js_fetch(
        f"{LLAMA_BASE}/{job_id}",
        to_js({
            "method": "GET",
            "headers": {"Authorization": f"Bearer {api_key}"},
        }, dict_converter=JSObject.fromEntries),
    )

    body = await resp.text()
    if not resp.ok:
        raise RuntimeError(f"LlamaParse status check failed: {resp.status} {body[:300]}")

    data = json.loads(body)
    status = data.get("status", "PENDING").upper()

    if status in ("ERROR", "FAILED"):
        raise RuntimeError(f"LlamaParse job {job_id} failed: {data}")

    if status not in ("COMPLETED", "SUCCESS"):
        return {"status": status}

    # Step 2: Fetch result — try markdown first, fall back to text (Fast tier has no markdown)
    text = ""
    pages_count = 0

    for fmt in ("markdown", "text"):
        result_resp = await js_fetch(
            f"{LLAMA_BASE}/{job_id}/result/{fmt}",
            to_js({
                "method": "GET",
                "headers": {"Authorization": f"Bearer {api_key}"},
            }, dict_converter=JSObject.fromEntries),
        )

        if not result_resp.ok:
            continue  # try next format

        result_body = await result_resp.text()
        result_data = json.loads(result_body)

        if fmt == "markdown":
            pages = result_data.get("pages", result_data.get("markdown", []))
            if isinstance(pages, list) and pages:
                text = "\n\n".join(
                    p.get("md", str(p)) if isinstance(p, dict) else str(p)
                    for p in pages
                )
                pages_count = len(pages)
            else:
                text = str(pages) if pages else ""
                pages_count = 1
        else:
            # text format: may be a string or {"text": "..."} or {"pages": [...]}
            if isinstance(result_data, str):
                text = result_data
            elif isinstance(result_data, dict):
                pages = result_data.get("pages", [])
                if isinstance(pages, list) and pages:
                    text = "\n\n".join(
                        p.get("text", str(p)) if isinstance(p, dict) else str(p)
                        for p in pages
                    )
                    pages_count = len(pages)
                else:
                    text = result_data.get("text", str(result_data))
            pages_count = pages_count or 1

        if text and text.strip():
            break  # got usable text

    if not text or not text.strip():
        raise RuntimeError(f"No text extracted from LlamaParse job {job_id}")

    return {
        "status": "COMPLETED",
        "text": text,
        "metadata": {
            "job_id": job_id,
            "pages_parsed": pages_count,
            "parser": "llamaparse_v2",
        },
    }


# ---------------------------------------------------------------------------
# Main Worker Entrypoint
# ---------------------------------------------------------------------------

class Default(WorkerEntrypoint):
    """Main Worker entrypoint with user-based resume RAG."""

    _llm: Optional[Any] = None

    # ---- Shared helpers ------------------------------------------------

    @property
    def _cors_headers(self):
        return {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
            "Access-Control-Max-Age": "86400",
        }

    def _get_llm(self):
        """Lazy-initialise the LLM once per worker instance."""
        if self._llm is None:
            from langchain_cloudflare import ChatCloudflareWorkersAI
            self._llm = ChatCloudflareWorkersAI(
                binding=self.env.AI,
                model="@cf/meta/llama-3.3-70b-instruct-fp8-fast",
            )
        return self._llm

    def _authenticate(self, request) -> Optional[Response]:
        """Validate API key. Returns an error Response if invalid, None if ok."""
        expected = getattr(self.env, "API_KEY", None)
        if not expected:
            return None  # no key configured — skip auth
        provided = None
        try:
            provided = (
                request.headers.get("X-API-Key")
                or request.headers.get("x-api-key")
            )
        except Exception:
            pass
        if not provided or provided != expected:
            return Response.json(
                {"success": False, "error": "Unauthorized"},
                status=401,
                headers=self._cors_headers,
            )
        return None

    async def _delete_existing_vectors(self, namespace: str):
        """Remove all existing vectors in a namespace before re-upload."""
        try:
            manifest_id = f"{namespace}:manifest"
            results = await self.env.VECTORIZE.getByIds([manifest_id])
            vectors = get_attr(results, "vectors", []) or []
            old_count = 0
            for v in vectors:
                meta = get_attr(v, "metadata", {})
                if isinstance(meta, dict):
                    old_count = meta.get("chunk_count", 0)
            ids_to_delete = [f"{namespace}:chunk_{i:04d}" for i in range(old_count)]
            ids_to_delete.append(manifest_id)
            await self.env.VECTORIZE.deleteByIds(ids_to_delete)
        except Exception:
            pass  # non-fatal: worst case we upsert over old data

    # ---- Route handlers ------------------------------------------------

    async def _handle_health(self, _request):
        return Response.json({
            "status": "healthy",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "bindings": {
                "ai": hasattr(self.env, "AI"),
                "vectorize": hasattr(self.env, "VECTORIZE"),
            },
        }, headers=self._cors_headers)

    async def _handle_resume_status(self, request):
        """Check if a resume exists for a user by looking up the manifest vector."""
        try:
            body = await request.json()
            user_id = body.get("user_id")
            resume_id = body.get("resume_id", "latest")

            if not user_id:
                return Response.json({
                    "success": False, "error": "user_id required"
                }, status=400, headers=self._cors_headers)

            namespace = resume_namespace(user_id, resume_id)
            manifest_id = f"{namespace}:manifest"
            results = await self.env.VECTORIZE.getByIds([manifest_id])
            vectors = get_attr(results, "vectors", []) or []

            if not vectors:
                return Response.json({
                    "success": True,
                    "exists": False,
                }, headers=self._cors_headers)

            meta = get_attr(vectors[0], "metadata", {}) or {}
            if not isinstance(meta, dict):
                meta = {}

            return Response.json({
                "success": True,
                "exists": True,
                "resume_id": meta.get("resume_id", resume_id),
                "chunk_count": meta.get("chunk_count", 0),
                "filename": meta.get("filename", None),
                "ingested_at": meta.get("ingested_at", None),
            }, headers=self._cors_headers)

        except Exception as e:
            return Response.json({
                "success": False,
                "error": f"Status check failed: {str(e)}"
            }, status=500, headers=self._cors_headers)

    async def _handle_store_resume(self, request):
        body = await request.json()
        resume = ResumeData(**body)

        resume_text = format_resume_text(resume)
        chunks = chunk_text(resume_text)

        resume_id = resume.metadata.get("resume_id", "latest")
        namespace = resume_namespace(resume.user_id, resume_id)

        # Delete old vectors so stale chunks don't pollute the index
        await self._delete_existing_vectors(namespace)

        vectors_to_insert = []
        for i, chunk in enumerate(chunks):
            embedding = await generate_embedding(self.env.AI, chunk)
            vectors_to_insert.append({
                "id": f"{namespace}:chunk_{i:04d}",
                "values": embedding,
                "namespace": namespace,
                "metadata": {
                    "user_id": resume.user_id,
                    "name": resume.name,
                    "chunk_index": i,
                    "total_chunks": len(chunks),
                    "text": chunk,
                    "resume_id": resume_id,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                },
            })

        if vectors_to_insert:
            await self.env.VECTORIZE.upsert(vectors_to_insert)

        # Embed the actual summary for a distinctive manifest vector
        manifest_text = f"{resume.name} — {resume.summary[:500]}"
        manifest_embedding = await generate_embedding(self.env.AI, manifest_text)
        await self.env.VECTORIZE.upsert([{
            "id": f"{namespace}:manifest",
            "values": manifest_embedding,
            "namespace": namespace,
            "metadata": {
                "type": "manifest",
                "user_id": resume.user_id,
                "name": resume.name,
                "resume_id": resume_id,
                "chunk_count": len(chunks),
                "ingested_at": datetime.now(timezone.utc).isoformat(),
            },
        }])

        return Response.json({
            "success": True,
            "user_id": resume.user_id,
            "resume_id": resume_id,
            "chunks_stored": len(chunks),
            "namespace": namespace,
        }, headers=self._cors_headers)

    async def _handle_upload_pdf(self, request):
        """Fire-and-forget: submit PDF to LlamaParse v2, return job_id immediately."""
        try:
            body = await request.json()
            pdf_req = PdfUploadRequest(**body)

            pdf_bytes = base64.b64decode(pdf_req.pdf_base64)

            llama_key = getattr(self.env, "LLAMA_CLOUD_API_KEY", None)
            if not llama_key:
                return Response.json({
                    "success": False,
                    "error": "LLAMA_CLOUD_API_KEY not configured"
                }, status=500, headers=self._cors_headers)

            job_info = await submit_pdf_to_llamaparse(
                pdf_bytes, pdf_req.filename, llama_key
            )

            return Response.json({
                "success": True,
                "job_id": job_info["job_id"],
                "tier": job_info["tier"],
                "status": "PENDING",
                "user_id": pdf_req.user_id,
                "filename": pdf_req.filename,
            }, headers=self._cors_headers)

        except Exception as e:
            return Response.json({
                "success": False,
                "error": f"PDF upload failed: {str(e)}"
            }, status=500, headers=self._cors_headers)

    async def _handle_ingest_parse(self, request):
        """Poll LlamaParse status; when COMPLETED, chunk + embed + store in Vectorize."""
        try:
            body = await request.json()
            job_id = body.get("job_id")
            user_id = body.get("user_id")
            filename = body.get("filename", "resume.pdf")

            if not job_id or not user_id:
                return Response.json({
                    "success": False, "error": "job_id and user_id required"
                }, status=400, headers=self._cors_headers)

            llama_key = getattr(self.env, "LLAMA_CLOUD_API_KEY", None)
            if not llama_key:
                return Response.json({
                    "success": False, "error": "LLAMA_CLOUD_API_KEY not configured"
                }, status=500, headers=self._cors_headers)

            result = await fetch_llamaparse_result(job_id, llama_key)

            if result["status"] != "COMPLETED":
                return Response.json({
                    "success": True,
                    "status": result["status"],
                    "job_id": job_id,
                }, headers=self._cors_headers)

            # ---- Job completed — ingest into Vectorize ----
            resume_text = result["text"]
            parse_metadata = result["metadata"]

            if not resume_text or len(resume_text.strip()) < 50:
                return Response.json({
                    "success": False,
                    "error": "Failed to extract meaningful text from PDF",
                    "status": "COMPLETED",
                }, status=400, headers=self._cors_headers)

            chunks = chunk_text(resume_text)
            resume_id = "latest"
            namespace = resume_namespace(user_id, resume_id)

            await self._delete_existing_vectors(namespace)

            vectors_to_insert = []
            for i, chunk in enumerate(chunks):
                embedding = await generate_embedding(self.env.AI, chunk)
                vectors_to_insert.append({
                    "id": f"{namespace}:chunk_{i:04d}",
                    "values": embedding,
                    "namespace": namespace,
                    "metadata": {
                        "user_id": user_id,
                        "name": user_id,
                        "chunk_index": i,
                        "total_chunks": len(chunks),
                        "text": chunk,
                        "resume_id": resume_id,
                        "filename": filename,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    },
                })

            if vectors_to_insert:
                await self.env.VECTORIZE.upsert(vectors_to_insert)

            manifest_text = f"{user_id} — {resume_text[:500]}"
            manifest_embedding = await generate_embedding(self.env.AI, manifest_text)
            await self.env.VECTORIZE.upsert([{
                "id": f"{namespace}:manifest",
                "values": manifest_embedding,
                "namespace": namespace,
                "metadata": {
                    "type": "manifest",
                    "user_id": user_id,
                    "name": user_id,
                    "resume_id": resume_id,
                    "chunk_count": len(chunks),
                    "filename": filename,
                    "ingested_at": datetime.now(timezone.utc).isoformat(),
                    **parse_metadata,
                },
            }])

            return Response.json({
                "success": True,
                "status": "COMPLETED",
                "job_id": job_id,
                "user_id": user_id,
                "resume_id": resume_id,
                "chunks_stored": len(chunks),
                "namespace": namespace,
                "filename": filename,
            }, headers=self._cors_headers)

        except Exception as e:
            return Response.json({
                "success": False,
                "error": f"Ingest failed: {str(e)}"
            }, status=500, headers=self._cors_headers)

    async def _handle_search_resumes(self, request):
        body = await request.json()
        search_req = SearchRequest(**body)

        query_embedding = await generate_embedding(self.env.AI, search_req.query)

        results = await self.env.VECTORIZE.query(
            vector=query_embedding,
            topK=search_req.limit,
            namespace=resume_namespace(search_req.user_id, search_req.resume_id),
            returnMetadata=True,
        )

        formatted_results = []
        for match in get_attr(results, "matches", []) or []:
            metadata = get_attr(match, "metadata", {}) or {}
            formatted_results.append({
                "text": metadata.get("text", ""),
                "name": metadata.get("name"),
                "user_id": metadata.get("user_id"),
                "chunk_index": metadata.get("chunk_index"),
                "score": get_attr(match, "score", None),
                "metadata": {k: v for k, v in metadata.items() if k != "text"},
            })

        return Response.json({
            "success": True,
            "user_id": search_req.user_id,
            "query": search_req.query,
            "results": formatted_results,
            "count": len(formatted_results),
        }, headers=self._cors_headers)

    async def _handle_chat(self, request):
        body = await request.json()
        chat_req = ChatRequest(**body)

        query_embedding = await generate_embedding(self.env.AI, chat_req.message)

        results = await self.env.VECTORIZE.query(
            vector=query_embedding,
            topK=5,
            namespace=resume_namespace(chat_req.user_id, chat_req.resume_id),
            returnMetadata=True,
        )

        context_parts = []
        for match in get_attr(results, "matches", []) or []:
            metadata = get_attr(match, "metadata", {}) or {}
            text = metadata.get("text", "")
            if text:
                context_parts.append(text)

        context = (
            "\n\n".join(context_parts)
            if context_parts
            else "No relevant resume information found."
        )

        from langchain_core.prompts import ChatPromptTemplate
        
        llm = self._get_llm()
        prompt = ChatPromptTemplate.from_messages([
            ("system",
             "You are a helpful resume assistant. Answer questions based "
             "solely on the resume context provided.\n\nContext:\n{context}"),
            ("user", "{message}"),
        ])

        chain = prompt | llm
        response = await chain.ainvoke({
            "context": context,
            "message": chat_req.message,
        })

        return Response.json({
            "success": True,
            "user_id": chat_req.user_id,
            "message": chat_req.message,
            "response": response.content,
            "context_count": len(context_parts),
        }, headers=self._cors_headers)

    # ---- Main fetch dispatcher -----------------------------------------

    async def fetch(self, request):
        """Handle incoming HTTP requests."""
        try:
            # CORS preflight — 204 with max-age so browsers cache it
            if request.method == "OPTIONS":
                return Response("", status=204, headers=self._cors_headers)

            path = _extract_path(request.url)
            method = request.method

            # Health check is unauthenticated
            if path == "health" or (not path and method == "GET"):
                return await self._handle_health(request)

            # All other routes require a valid API key (when configured)
            auth_err = self._authenticate(request)
            if auth_err:
                return auth_err

            # Routing table
            routes = {
                ("store-resume", "POST"): self._handle_store_resume,
                ("upload-pdf", "POST"): self._handle_upload_pdf,
                ("ingest-parse", "POST"): self._handle_ingest_parse,
                ("resume-status", "POST"): self._handle_resume_status,
                ("search-resumes", "POST"): self._handle_search_resumes,
                ("chat", "POST"): self._handle_chat,
            }

            handler = routes.get((path, method))
            if handler:
                try:
                    return await handler(request)
                except (ValueError, KeyError) as exc:
                    # Client errors: validation failures, missing fields
                    return Response.json(
                        {"success": False, "error": str(exc)},
                        status=400,
                        headers=self._cors_headers,
                    )
                except Exception as exc:
                    # Server errors: embedding failures, Vectorize timeouts, etc.
                    return Response.json(
                        {"success": False, "error": f"Internal server error: {str(exc)}"},
                        status=500,
                        headers=self._cors_headers,
                    )

            # Default: list available endpoints
            return Response.json({
                "name": "Resume RAG Worker",
                "version": "2.0.0",
                "endpoints": {
                    "GET /health": "Health check",
                    "POST /upload-pdf": "Submit PDF to LlamaParse (returns job_id)",
                    "POST /ingest-parse": "Poll parse status & ingest when ready",
                    "POST /resume-status": "Check if a resume exists for a user",
                    "POST /store-resume": "Store resume with embeddings",
                    "POST /search-resumes": "Semantic search across resumes",
                    "POST /chat": "RAG-powered chat about resume",
                },
            }, headers=self._cors_headers)

        except Exception as exc:
            return Response.json(
                {"success": False, "error": f"Request failed: {str(exc)}"},
                status=500,
                headers=self._cors_headers,
            )
