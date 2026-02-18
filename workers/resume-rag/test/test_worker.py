#!/usr/bin/env python3
"""
Test script for Resume RAG Worker.

Usage:
    python test/test_worker.py [worker-url]

Example:
    python test/test_worker.py https://nomadically-work-resume-rag.workers.dev
    python test/test_worker.py http://localhost:8788  # for local testing
"""

import json
import sys
from pathlib import Path


def test_worker(base_url: str):
    """Test all worker endpoints."""
    import requests
    
    print(f"Testing Resume RAG Worker at: {base_url}\n")
    print("=" * 60)
    
    # Test 1: Health check
    print("\n1. Testing health endpoint...")
    try:
        response = requests.get(f"{base_url}/health")
        print(f"   Status: {response.status_code}")
        print(f"   Response: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 2: Store a resume
    print("\n2. Testing store-resume endpoint...")
    try:
        # Load sample resume
        sample_file = Path(__file__).parent / "sample-resume.json"
        with open(sample_file, "r") as f:
            resume_data = json.load(f)
        
        response = requests.post(
            f"{base_url}/store-resume",
            json=resume_data
        )
        print(f"   Status: {response.status_code}")
        result = response.json()
        print(f"   Response: {json.dumps(result, indent=2)}")
        
        resume_id = result.get("resume_id")
        
    except Exception as e:
        print(f"   Error: {e}")
        resume_id = None
    
    # Test 3: Search resumes
    print("\n3. Testing search-resumes endpoint...")
    try:
        search_queries = [
            "React and TypeScript engineer",
            "Python developer with AWS experience",
            "Team lead with startup experience"
        ]
        
        for query in search_queries:
            print(f"\n   Query: '{query}'")
            response = requests.post(
                f"{base_url}/search-resumes",
                json={
                    "query": query,
                    "limit": 3
                }
            )
            print(f"   Status: {response.status_code}")
            result = response.json()
            if result.get("success"):
                print(f"   Found {result.get('count')} results")
                for idx, res in enumerate(result.get("results", []), 1):
                    score = res.get("score", "N/A")
                    name = res.get("metadata", {}).get("name", "Unknown")
                    print(f"   [{idx}] {name} (score: {score})")
            else:
                print(f"   Error: {result.get('error')}")
                
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 4: RAG chat
    print("\n4. Testing chat endpoint...")
    try:
        messages = [
            "Who are the best React developers in the database?",
            "Find engineers with cloud architecture experience",
            "Do we have any candidates who led teams?"
        ]
        
        for message in messages:
            print(f"\n   User: {message}")
            response = requests.post(
                f"{base_url}/chat",
                json={
                    "message": message,
                    "user_id": "test_recruiter"
                }
            )
            print(f"   Status: {response.status_code}")
            result = response.json()
            if result.get("success"):
                print(f"   AI: {result.get('response')[:200]}...")
                print(f"   Context used: {result.get('context_count')} resumes")
            else:
                print(f"   Error: {result.get('error')}")
                
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 5: Manage memory
    print("\n5. Testing manage-memory endpoint...")
    try:
        memory_data = {
            "user_id": "test_recruiter",
            "content": "I prefer candidates with strong React skills and startup experience",
            "metadata": {
                "type": "preference",
                "created": "2025-02-17"
            }
        }
        
        response = requests.post(
            f"{base_url}/manage-memory",
            json=memory_data
        )
        print(f"   Status: {response.status_code}")
        result = response.json()
        print(f"   Response: {json.dumps(result, indent=2)}")
        
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 6: List memories
    print("\n6. Testing memories endpoint...")
    try:
        response = requests.get(
            f"{base_url}/memories",
            params={"user_id": "test_recruiter"}
        )
        print(f"   Status: {response.status_code}")
        result = response.json()
        if result.get("success"):
            print(f"   Found {result.get('count')} memories")
            for memory in result.get("memories", []):
                print(f"   - {memory.get('content')[:80]}...")
        else:
            print(f"   Error: {result.get('error')}")
            
    except Exception as e:
        print(f"   Error: {e}")
    
    print("\n" + "=" * 60)
    print("\nAll tests completed!")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        worker_url = sys.argv[1].rstrip("/")
    else:
        # Default to local development
        worker_url = "http://localhost:8788"
    
    try:
        test_worker(worker_url)
    except ImportError:
        print("Error: requests library not found.")
        print("Install it with: pip install requests")
        sys.exit(1)
