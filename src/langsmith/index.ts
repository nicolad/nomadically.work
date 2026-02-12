import { Client } from "langsmith";

let singleton: Client | null = null;

/**
 * Get the singleton LangSmith client instance.
 * Configured automatically from environment variables.
 */
export function getLangSmithClient(): Client {
  if (!singleton) {
    const apiKey = process.env.LANGSMITH_API_KEY;
    if (!apiKey) {
      throw new Error("LANGSMITH_API_KEY environment variable is required");
    }
    
    singleton = new Client({
      apiKey,
      apiUrl: process.env.LANGSMITH_API_URL,
    });
  }
  return singleton;
}

/**
 * Convert user email to a safe LangSmith handle.
 * Example: "alice@example.com" -> "alice-example-com"
 */
export function toUserHandle(userEmail: string): string {
  return userEmail
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@._-]+/g, "-")
    .replace(/@/g, "-at-")
    .replace(/\./g, "-");
}

/**
 * Ensure prompt identifier has the correct owner prefix.
 * If identifier already has owner/ prefix, validates it matches the user.
 * If not, prepends the user's handle.
 */
export function ensureUserPromptIdentifier(
  promptIdentifier: string,
  userEmail: string
): string {
  const userHandle = toUserHandle(userEmail);
  
  // If already has owner/ format
  if (promptIdentifier.includes("/")) {
    const [owner, ...rest] = promptIdentifier.split("/");
    
    // Validate owner matches user
    if (owner !== userHandle) {
      throw new Error(
        `Prompt identifier owner "${owner}" does not match your handle "${userHandle}". ` +
        `Either use "${userHandle}/${rest.join("/")}" or just "${rest.join("/")}".`
      );
    }
    
    return promptIdentifier;
  }
  
  // No owner prefix, add user's handle
  return `${userHandle}/${promptIdentifier}`;
}

export interface LangSmithPrompt {
  id: string;
  promptHandle: string;
  fullName: string;
  description?: string;
  readme?: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  isArchived: boolean;
  tags: string[];
  owner?: string;
  numLikes: number;
  numDownloads: number;
  numViews: number;
  numCommits: number;
  lastCommitHash?: string;
  likedByAuthUser: boolean;
}

export interface LangSmithPromptCommit {
  owner: string;
  promptName: string;
  commitHash: string;
  manifest: Record<string, any>;
  examples: Array<Record<string, any>>;
}

export interface CreateLangSmithPromptInput {
  description?: string;
  readme?: string;
  tags?: string[];
  isPublic?: boolean;
}

export interface UpdateLangSmithPromptInput {
  description?: string;
  readme?: string;
  tags?: string[];
  isPublic?: boolean;
  isArchived?: boolean;
}

export interface PushLangSmithPromptInput {
  object?: any;
  parentCommitHash?: string;
  description?: string;
  readme?: string;
  tags?: string[];
  isPublic?: boolean;
}

/**
 * Fetch a specific prompt from LangSmith
 */
export async function fetchLangSmithPrompt(
  promptIdentifier: string
): Promise<LangSmithPrompt | null> {
  const client = getLangSmithClient();
  
  try {
    const prompt = await client.getPrompt(promptIdentifier);
    
    if (!prompt) {
      return null;
    }
    
    return {
      id: prompt.id,
      promptHandle: prompt.repo_handle,
      fullName: prompt.full_name,
      description: prompt.description,
      readme: prompt.readme,
      tenantId: prompt.tenant_id,
      createdAt: prompt.created_at,
      updatedAt: prompt.updated_at,
      isPublic: prompt.is_public,
      isArchived: prompt.is_archived,
      tags: prompt.tags,
      owner: prompt.owner,
      numLikes: prompt.num_likes,
      numDownloads: prompt.num_downloads,
      numViews: prompt.num_views,
      numCommits: prompt.num_commits,
      lastCommitHash: prompt.last_commit_hash,
      likedByAuthUser: prompt.liked_by_auth_user,
    };
  } catch (error) {
    console.error("Error fetching LangSmith prompt:", error);
    throw new Error(
      `Failed to fetch prompt "${promptIdentifier}": ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Fetch a specific prompt commit with manifest
 */
export async function fetchLangSmithPromptCommit(
  promptIdentifier: string,
  options?: { includeModel?: boolean }
): Promise<LangSmithPromptCommit> {
  const client = getLangSmithClient();
  
  try {
    const commit = await client.pullPromptCommit(promptIdentifier, options);
    
    return {
      owner: commit.owner,
      promptName: commit.repo,
      commitHash: commit.commit_hash,
      manifest: commit.manifest,
      examples: commit.examples,
    };
  } catch (error) {
    console.error("Error fetching LangSmith prompt commit:", error);
    throw new Error(
      `Failed to fetch prompt commit "${promptIdentifier}": ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * List all prompts from LangSmith
 */
export async function listLangSmithPrompts(options?: {
  isPublic?: boolean;
  isArchived?: boolean;
  query?: string;
}): Promise<LangSmithPrompt[]> {
  const client = getLangSmithClient();
  
  try {
    const prompts: LangSmithPrompt[] = [];
    let count = 0;
    const MAX_PROMPTS = 100; // Limit to prevent infinite loops
    
    // Use async iterator with safety limits
    for await (const prompt of client.listPrompts(options)) {
      prompts.push({
        id: prompt.id,
        promptHandle: prompt.repo_handle,
        fullName: prompt.full_name,
        description: prompt.description,
        readme: prompt.readme,
        tenantId: prompt.tenant_id,
        createdAt: prompt.created_at,
        updatedAt: prompt.updated_at,
        isPublic: prompt.is_public,
        isArchived: prompt.is_archived,
        tags: prompt.tags,
        owner: prompt.owner,
        numLikes: prompt.num_likes,
        numDownloads: prompt.num_downloads,
        numViews: prompt.num_views,
        numCommits: prompt.num_commits,
        lastCommitHash: prompt.last_commit_hash,
        likedByAuthUser: prompt.liked_by_auth_user,
      });
      
      count++;
      if (count >= MAX_PROMPTS) {
        console.warn(`Reached maximum limit of ${MAX_PROMPTS} prompts`);
        break;
      }
    }
    
    return prompts;
  } catch (error) {
    console.error("Error listing LangSmith prompts:", error);
    throw new Error(
      `Failed to list prompts: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Create a new prompt in LangSmith
 */
export async function createLangSmithPrompt(
  promptIdentifier: string,
  input?: CreateLangSmithPromptInput
): Promise<LangSmithPrompt> {
  const client = getLangSmithClient();
  
  try {
    const prompt = await client.createPrompt(promptIdentifier, input);
    
    return {
      id: prompt.id,
      promptHandle: prompt.repo_handle,
      fullName: prompt.full_name,
      description: prompt.description,
      readme: prompt.readme,
      tenantId: prompt.tenant_id,
      createdAt: prompt.created_at,
      updatedAt: prompt.updated_at,
      isPublic: prompt.is_public,
      isArchived: prompt.is_archived,
      tags: prompt.tags,
      owner: prompt.owner,
      numLikes: prompt.num_likes,
      numDownloads: prompt.num_downloads,
      numViews: prompt.num_views,
      numCommits: prompt.num_commits,
      lastCommitHash: prompt.last_commit_hash,
      likedByAuthUser: prompt.liked_by_auth_user,
    };
  } catch (error: any) {
    console.error("Error creating LangSmith prompt:", error);
    
    // Handle 403 permission errors with helpful guidance
    if (error?.message?.includes("403") || error?.message?.includes("Forbidden")) {
      throw new Error(
        "LangSmith API key lacks 'Prompt Engineering' permissions. " +
        "Please generate a new API key with Read, Write, AND Prompt Engineering scopes at " +
        "https://smith.langchain.com/settings and update LANGSMITH_API_KEY in .env.local. " +
        "See LANGSMITH_SETUP.md for detailed instructions."
      );
    }
    
    throw new Error(
      `Failed to create prompt: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Update an existing prompt in LangSmith
 */
export async function updateLangSmithPrompt(
  promptIdentifier: string,
  input: UpdateLangSmithPromptInput
): Promise<LangSmithPrompt> {
  const client = getLangSmithClient();
  
  try {
    await client.updatePrompt(promptIdentifier, input);
    
    // Fetch updated prompt to return full object
    const prompt = await client.getPrompt(promptIdentifier);
    
    if (!prompt) {
      throw new Error("Prompt not found after update");
    }
    
    return {
      id: prompt.id,
      promptHandle: prompt.repo_handle,
      fullName: prompt.full_name,
      description: prompt.description,
      readme: prompt.readme,
      tenantId: prompt.tenant_id,
      createdAt: prompt.created_at,
      updatedAt: prompt.updated_at,
      isPublic: prompt.is_public,
      isArchived: prompt.is_archived,
      tags: prompt.tags,
      owner: prompt.owner,
      numLikes: prompt.num_likes,
      numDownloads: prompt.num_downloads,
      numViews: prompt.num_views,
      numCommits: prompt.num_commits,
      lastCommitHash: prompt.last_commit_hash,
      likedByAuthUser: prompt.liked_by_auth_user,
    };
  } catch (error) {
    console.error("Error updating LangSmith prompt:", error);
    throw new Error(
      `Failed to update prompt: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Delete a prompt from LangSmith
 */
export async function deleteLangSmithPrompt(promptIdentifier: string): Promise<boolean> {
  const client = getLangSmithClient();
  
  try {
    await client.deletePrompt(promptIdentifier);
    return true;
  } catch (error) {
    console.error("Error deleting LangSmith prompt:", error);
    throw new Error(
      `Failed to delete prompt: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Push a prompt (create/update metadata and optionally add a commit)
 */
export async function pushLangSmithPrompt(
  promptIdentifier: string,
  input?: PushLangSmithPromptInput
): Promise<string> {
  const client = getLangSmithClient();
  
  try {
    const url = await client.pushPrompt(promptIdentifier, input);
    return url;
  } catch (error: any) {
    console.error("Error pushing LangSmith prompt:", error);
    
    // Handle 403 permission errors with helpful guidance
    if (error?.message?.includes("403") || error?.message?.includes("Forbidden")) {
      throw new Error(
        "LangSmith API key lacks 'Prompt Engineering' permissions. " +
        "Please generate a new API key with Read, Write, AND Prompt Engineering scopes at " +
        "https://smith.langchain.com/settings and update LANGSMITH_API_KEY in .env.local. " +
        "See LANGSMITH_SETUP.md for detailed instructions."
      );
    }
    
    throw new Error(
      `Failed to push prompt: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
