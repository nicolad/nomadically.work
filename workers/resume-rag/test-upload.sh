#!/bin/bash

# Test multipart/form-data upload to the resume RAG worker

WORKER_URL="https://nomadically-work-resume-rag.eeeew.workers.dev"
TEST_EMAIL="test@example.com"
TEST_USER_ID="test_user"

# Create a simple test PDF (actually just text, but for testing structure)
# For a real test, use an actual PDF file
TEST_FILE="test-resume.pdf"

echo "Testing multipart upload to $WORKER_URL/upload"
echo "Email: $TEST_EMAIL"
echo

# Note: This requires an actual PDF file at $TEST_FILE
# For now, just show the curl command structure
echo "To test with a real PDF, run:"
echo "curl -X POST $WORKER_URL/upload \\"
echo "  -F 'file=@your-resume.pdf' \\"
echo "  -F 'email=$TEST_EMAIL' \\"
echo "  -F 'user_id=$TEST_USER_ID'"
echo

# Test health endpoint
echo "Testing health endpoint:"
curl -s "$WORKER_URL/health" | jq .
