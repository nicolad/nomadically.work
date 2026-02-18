"""
Simple Resume RAG Example Client

Usage:
  python resume_client.py --email user@example.com --action upload --resume-file resume.txt
  python resume_client.py --email user@example.com --action ask --question "What's my Python experience?"
"""

import requests
import argparse
from pathlib import Path


WORKER_URL = "https://nomadically-work-resume-rag.workers.dev"


def upload_resume(email: str, resume_file: str):
    """Upload resume text to the RAG worker."""
    resume_text = Path(resume_file).read_text()
    
    response = requests.post(
        f"{WORKER_URL}/store-resume",
        json={
            "email": email,
            "user_id": email.split('@')[0],  # Simple user_id from email
            "name": "Resume",
            "summary": resume_text[:500],  # First 500 chars as summary
            "experience": resume_text,
            "skills": [],
            "metadata": {"source": resume_file}
        }
    )
    
    result = response.json()
    if result.get("success"):
        print(f"✅ Resume uploaded successfully!")
        print(f"   Email: {result['email']}")
        print(f"   Resume ID: {result['resume_id']}")
        print(f"   Chunks: {result['chunks_stored']}")
    else:
        print(f"❌ Upload failed: {result.get('error')}")


def ask_question(email: str, question: str):
    """Ask a question about the resume."""
    response = requests.post(
        f"{WORKER_URL}/chat",
        json={
            "email": email,
            "message": question,
            "resume_id": "latest"
        }
    )
    
    result = response.json()
    if result.get("success"):
        print(f"\n💬 Question: {question}")
        print(f"\n🤖 Answer:\n{result['response']}")
        print(f"\n📊 Used {result['context_count']} resume sections")
    else:
        print(f"❌ Query failed: {result.get('error')}")


def search_resume(email: str, query: str):
    """Search resume content."""
    response = requests.post(
        f"{WORKER_URL}/search-resumes",
        json={
            "email": email,
            "query": query,
            "limit": 5
        }
    )
    
    result = response.json()
    if result.get("success"):
        print(f"\n🔍 Search: {query}")
        print(f"\n📄 Found {result['count']} results:\n")
        for i, item in enumerate(result['results'], 1):
            print(f"{i}. Score: {item['score']:.3f}")
            print(f"   {item['text'][:150]}...\n")
    else:
        print(f"❌ Search failed: {result.get('error')}")


def health_check():
    """Check worker health."""
    response = requests.get(f"{WORKER_URL}/health")
    result = response.json()
    
    print(f"🏥 Worker Health: {result['status']}")
    print(f"   AI Binding: {'✅' if result['bindings']['ai'] else '❌'}")
    print(f"   Vectorize: {'✅' if result['bindings']['vectorize'] else '❌'}")


def main():
    parser = argparse.ArgumentParser(description="Resume RAG Client")
    parser.add_argument("--email", required=True, help="User email")
    parser.add_argument("--action", choices=["upload", "ask", "search", "health"], required=True)
    parser.add_argument("--resume-file", help="Path to resume text file (for upload)")
    parser.add_argument("--question", help="Question to ask (for ask)")
    parser.add_argument("--query", help="Search query (for search)")
    parser.add_argument("--worker-url", default=WORKER_URL, help="Worker URL")
    
    args = parser.parse_args()
    
    global WORKER_URL
    WORKER_URL = args.worker_url
    
    if args.action == "health":
        health_check()
    elif args.action == "upload":
        if not args.resume_file:
            print("❌ --resume-file required for upload")
            return
        upload_resume(args.email, args.resume_file)
    elif args.action == "ask":
        if not args.question:
            print("❌ --question required for ask")
            return
        ask_question(args.email, args.question)
    elif args.action == "search":
        if not args.query:
            print("❌ --query required for search")
            return
        search_resume(args.email, args.query)


if __name__ == "__main__":
    main()
