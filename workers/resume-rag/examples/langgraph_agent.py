"""
Example: Using Resume RAG Worker with LangGraph Agent

This example demonstrates how to create a LangGraph agent that uses
the CloudflareVectorizeLangmemStore for resume RAG and memory management.

Requirements:
    pip install langmem-cloudflare-vectorize langgraph langchain-cloudflare
"""

from langmem_cloudflare_vectorize import CloudflareVectorizeLangmemStore
from langchain_cloudflare.chat_models import ChatCloudflareWorkersAI
from langmem import create_manage_memory_tool, create_search_memory_tool
from langgraph.prebuilt import create_react_agent
from langchain_core.tools import tool

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# Cloudflare credentials (replace with your actual values)
CLOUDFLARE_ACCOUNT_ID = "your-cloudflare-account-id"
VECTORIZE_API_TOKEN = "your-vectorize-api-token"
WORKERS_AI_TOKEN = "your-workers-ai-token"
VECTORIZE_INDEX_NAME = "resume-rag-index"

# ---------------------------------------------------------------------------
# Setup Agent Store and LLM
# ---------------------------------------------------------------------------

# Create the LangMem vectorize store
agent_store = CloudflareVectorizeLangmemStore.with_cloudflare_embeddings(
    account_id=CLOUDFLARE_ACCOUNT_ID,
    index_name=VECTORIZE_INDEX_NAME,
    vectorize_api_token=VECTORIZE_API_TOKEN,
    workers_ai_token=WORKERS_AI_TOKEN,
    embedding_model="@cf/baai/bge-base-en-v1.5",
    dimensions=768
)

# Create the LLM
cloudflare_llm = ChatCloudflareWorkersAI(
    cloudflare_account_id=CLOUDFLARE_ACCOUNT_ID,
    cloudflare_api_token=WORKERS_AI_TOKEN,
    model="@cf/meta/llama-3.3-70b-instruct-fp8-fast"
)

# ---------------------------------------------------------------------------
# Create Memory Tools
# ---------------------------------------------------------------------------

# Memory tools for storing and searching user context
manage_memory = create_manage_memory_tool(
    namespace=("resume_preferences",)
)
search_memory = create_search_memory_tool(
    namespace=("resume_preferences",)
)

# ---------------------------------------------------------------------------
# Custom Tools for Resume Operations
# ---------------------------------------------------------------------------

@tool
def store_resume(
    name: str,
    summary: str,
    experience: str,
    skills: str,
    education: str = ""
) -> str:
    """Store a resume in the database.
    
    Args:
        name: Candidate name
        summary: Professional summary
        experience: Work experience details
        skills: Comma-separated list of skills
        education: Education details
    
    Returns:
        Success message with resume ID
    """
    import requests
    import time
    
    resume_data = {
        "user_id": f"candidate_{int(time.time())}",
        "name": name,
        "summary": summary,
        "experience": experience,
        "skills": skills.split(",") if isinstance(skills, str) else skills,
        "education": education,
        "metadata": {}
    }
    
    # Call the worker endpoint (adjust URL as needed)
    response = requests.post(
        "http://localhost:8788/store-resume",  # Change to your worker URL
        json=resume_data
    )
    
    if response.status_code == 200:
        result = response.json()
        return f"Successfully stored resume for {name}. Resume ID: {result.get('resume_id')}"
    else:
        return f"Error storing resume: {response.text}"


@tool
def search_candidates(query: str, limit: int = 5) -> str:
    """Search for candidates matching a query.
    
    Args:
        query: Search query describing desired candidate attributes
        limit: Maximum number of results to return
    
    Returns:
        List of matching candidates with their details
    """
    import requests
    
    response = requests.post(
        "http://localhost:8788/search-resumes",  # Change to your worker URL
        json={"query": query, "limit": limit}
    )
    
    if response.status_code == 200:
        result = response.json()
        if result.get("success"):
            candidates = result.get("results", [])
            if not candidates:
                return "No candidates found matching your query."
            
            output = f"Found {len(candidates)} candidates:\n\n"
            for idx, candidate in enumerate(candidates, 1):
                metadata = candidate.get("metadata", {})
                name = metadata.get("name", "Unknown")
                skills = metadata.get("skills", "")
                score = candidate.get("score", "N/A")
                
                output += f"{idx}. {name}\n"
                output += f"   Skills: {skills}\n"
                output += f"   Relevance Score: {score}\n"
                output += f"   Preview: {candidate.get('content', '')[:150]}...\n\n"
            
            return output
        else:
            return f"Search failed: {result.get('error')}"
    else:
        return f"Error searching candidates: {response.text}"


@tool
def get_hiring_preferences() -> str:
    """Get the recruiter's hiring preferences and requirements.
    
    Returns:
        Summary of hiring preferences
    """
    # This would be stored in memory using manage_memory
    return "Prefer candidates with: React, TypeScript, AWS experience, and startup background"


# ---------------------------------------------------------------------------
# Create the Agent
# ---------------------------------------------------------------------------

# Combine all tools
tools = [
    manage_memory,
    search_memory,
    store_resume,
    search_candidates,
    get_hiring_preferences,
]

# Create the ReAct agent
agent = create_react_agent(
    cloudflare_llm,
    tools=tools,
    store=agent_store,  # This is how LangMem gets access to your store
)

# ---------------------------------------------------------------------------
# Example Usage
# ---------------------------------------------------------------------------

def main():
    """Run example conversations with the agent."""
    
    config = {"configurable": {"thread_id": "recruiter_session_1"}}
    
    print("=" * 60)
    print("Resume RAG LangGraph Agent Demo")
    print("=" * 60)
    
    # Test 1: Store hiring preferences
    print("\n📝 CONVERSATION 1: Store hiring preferences")
    print("-" * 60)
    
    response1 = agent.invoke(
        {"messages": [{
            "role": "user",
            "content": "Please remember: I'm looking for senior React engineers with TypeScript and AWS experience. Startup experience is a plus. Use your manage_memory tool to store this."
        }]},
        config
    )
    print("User: Please remember: I'm looking for senior React engineers...")
    print(f"Agent: {response1['messages'][-1].content}")
    
    # Test 2: Search for candidates
    print("\n🔍 CONVERSATION 2: Search for candidates")
    print("-" * 60)
    
    response2 = agent.invoke(
        {"messages": [{
            "role": "user",
            "content": "Find me the best React developers. Use the search_candidates tool and consider my hiring preferences."
        }]},
        config
    )
    print("User: Find me the best React developers...")
    print(f"Agent: {response2['messages'][-1].content}")
    
    # Test 3: Recall preferences
    print("\n💭 CONVERSATION 3: Recall preferences")
    print("-" * 60)
    
    response3 = agent.invoke(
        {"messages": [{
            "role": "user",
            "content": "What were my hiring preferences again? Use search_memory to recall."
        }]},
        config
    )
    print("User: What were my hiring preferences again?")
    print(f"Agent: {response3['messages'][-1].content}")
    
    # Test 4: Complex query
    print("\n🎯 CONVERSATION 4: Complex query")
    print("-" * 60)
    
    response4 = agent.invoke(
        {"messages": [{
            "role": "user",
            "content": "I need someone who can lead a team and has cloud architecture experience. Search for candidates that match this."
        }]},
        config
    )
    print("User: I need someone who can lead a team and has cloud architecture experience...")
    print(f"Agent: {response4['messages'][-1].content}")
    
    print("\n" + "=" * 60)
    print("Demo completed!")


if __name__ == "__main__":
    try:
        main()
    except ImportError as e:
        print(f"Error: Missing dependency - {e}")
        print("\nInstall required packages:")
        print("pip install langmem-cloudflare-vectorize langgraph langchain-cloudflare requests")
    except Exception as e:
        print(f"Error: {e}")
        print("\nMake sure the Resume RAG Worker is running:")
        print("cd workers/resume-rag && npm run dev")
