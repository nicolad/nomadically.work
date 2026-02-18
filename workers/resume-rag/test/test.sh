#!/bin/bash
# Quick test script for Resume RAG Worker

WORKER_URL="${1:-http://localhost:8788}"

echo "Testing Resume RAG Worker at: $WORKER_URL"
echo "=========================================="

# Test 1: Health check
echo -e "\n1. Health Check"
curl -s "$WORKER_URL/health" | jq '.'

# Test 2: Store sample resume
echo -e "\n2. Store Sample Resume"
curl -s -X POST "$WORKER_URL/store-resume" \
  -H "Content-Type: application/json" \
  -d @test/sample-resume.json | jq '.'

# Test 3: Search for React developers
echo -e "\n3. Search: React developers"
curl -s -X POST "$WORKER_URL/search-resumes" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "React and TypeScript engineer with AWS experience",
    "limit": 5
  }' | jq '.results[] | {name: .metadata.name, score: .score, skills: .metadata.skills}'

# Test 4: Chat query
echoecho -e "\n4. Chat: Find React developers"
curl -s -X POST "$WORKER_URL/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Who are our best React developers with cloud experience?",
    "user_id": "test_recruiter"
  }' | jq '.response'

# Test 5: Store memory
echo -e "\n5. Store Memory"
curl -s -X POST "$WORKER_URL/manage-memory" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_recruiter",
    "content": "I prefer candidates with React, TypeScript, and startup experience"
  }' | jq '.'

# Test 6: List memories
echo -e "\n6. List Memories"
curl -s "$WORKER_URL/memories?user_id=test_recruiter" | jq '.'

echo -e "\n=========================================="
echo "All tests completed!"
