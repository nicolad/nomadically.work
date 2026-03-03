-- Seed React Auth / JWT study topics (deep dive content)

INSERT INTO study_topics (category, topic, title, summary, body_md, difficulty, tags, created_at, updated_at) VALUES
('react', 'jwt-basics', 'JWT Basics', 'A JSON Web Token is a compact, URL-safe token that encodes claims as a signed JSON payload. Understanding its structure is the foundation of every React auth implementation.', '## JWT Basics

```
header.payload.signature
```

Each part is Base64URL-encoded JSON, separated by dots.

---

## Structure

### Header
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

`alg` declares the signing algorithm. Common values:
- `HS256` — HMAC-SHA256 (symmetric, shared secret)
- `RS256` — RSA-SHA256 (asymmetric, private key signs / public key verifies)
- `ES256` — ECDSA-SHA256 (asymmetric, smaller signatures than RSA)

### Payload (Claims)
```json
{
  "sub": "user_123",
  "email": "alice@example.com",
  "role": "admin",
  "iat": 1712000000,
  "exp": 1712003600
}
```

Reserved claims:
| Claim | Meaning |
|-------|---------|
| `sub` | Subject — usually a user ID |
| `iss` | Issuer — who created the token |
| `aud` | Audience — intended recipient |
| `exp` | Expiry (Unix seconds) |
| `iat` | Issued at (Unix seconds) |
| `nbf` | Not before |

Custom claims (role, email, permissions) go in the same payload object.

### Signature
```
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  secret
)
```

The signature proves the token was issued by a known party and has not been tampered with. **It does not encrypt the payload** — anyone can decode the header and payload without the secret.

---

## Decoding vs Verifying

```ts
// Decoding — no secret, just reads the payload (UNSAFE for auth)
const payload = JSON.parse(atob(token.split(''.'')[1]))

// Verifying — checks signature + expiry (SAFE)
import { jwtVerify } from ''jose''

const { payload } = await jwtVerify(token, secret, {
  issuer: ''https://auth.example.com'',
  audience: ''https://api.example.com'',
})
```

Never trust a decoded-but-unverified JWT for access control decisions.

---

## Expiry and Rotation

Short-lived access tokens (5–15 min) paired with longer-lived refresh tokens (7–30 days) balance security and UX:

```
Access token  → short TTL, sent on every API request
Refresh token → long TTL, stored securely, used only to get new access tokens
```

---

## Interview Questions

1. **Is a JWT encrypted?** No — Base64URL is encoding, not encryption. Use JWE (JSON Web Encryption) if the payload must be confidential.
2. **What happens if the secret leaks?** All tokens ever signed with that secret must be considered compromised. Rotate the secret immediately and invalidate sessions.
3. **How do you invalidate a JWT before expiry?** JWTs are stateless — you must maintain a deny-list (Redis set of revoked `jti` claims) or use very short expiry + refresh token rotation.
4. **HS256 vs RS256 — when to prefer each?** HS256 is faster but requires every verifier to share the secret. RS256 lets you publish a JWKS endpoint so any service can verify tokens without the private key.', 'intermediate', '["jwt","authentication","security","base64","claims","tokens"]', datetime('now'), datetime('now'));

INSERT INTO study_topics (category, topic, title, summary, body_md, difficulty, tags, created_at, updated_at) VALUES
('react', 'auth-context', 'Auth Context Pattern', 'The canonical React pattern for sharing auth state: a Context + Provider that wraps the app, exposing user, token, login(), logout(), and isLoading.', '## Auth Context Pattern

The goal is a single source of truth for authentication state that any component can read without prop drilling.

---

## Full Implementation

```tsx
// src/auth/AuthContext.tsx
import { createContext, useContext, useState, useEffect, useCallback } from ''react''
import type { ReactNode } from ''react''

interface User {
  id: string
  email: string
  role: ''admin'' | ''user''
}

interface AuthState {
  user: User | null
  accessToken: string | null
  isLoading: boolean
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    isLoading: true,  // true on mount so we check stored session first
  })

  // Re-hydrate from stored refresh token on mount
  useEffect(() => {
    const restore = async () => {
      try {
        const res = await fetch(''/api/auth/refresh'', {
          method: ''POST'',
          credentials: ''include'',  // sends httpOnly refresh-token cookie
        })
        if (res.ok) {
          const { accessToken, user } = await res.json()
          setState({ user, accessToken, isLoading: false })
        } else {
          setState({ user: null, accessToken: null, isLoading: false })
        }
      } catch {
        setState({ user: null, accessToken: null, isLoading: false })
      }
    }
    restore()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(''/api/auth/login'', {
      method: ''POST'',
      headers: { ''Content-Type'': ''application/json'' },
      body: JSON.stringify({ email, password }),
      credentials: ''include'',  // server sets httpOnly refresh-token cookie
    })
    if (!res.ok) throw new Error(''Invalid credentials'')
    const { accessToken, user } = await res.json()
    setState({ user, accessToken, isLoading: false })
  }, [])

  const logout = useCallback(() => {
    fetch(''/api/auth/logout'', { method: ''POST'', credentials: ''include'' })
    setState({ user: null, accessToken: null, isLoading: false })
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// Typed hook — throws if used outside provider
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error(''useAuth must be used inside <AuthProvider>'')
  return ctx
}
```

---

## Usage

```tsx
// Wrap the app once
<AuthProvider>
  <App />
</AuthProvider>

// Anywhere in the tree
function Header() {
  const { user, logout, isLoading } = useAuth()
  if (isLoading) return <Spinner />
  return user
    ? <button onClick={logout}>Sign out ({user.email})</button>
    : <Link href=''/login''>Sign in</Link>
}
```

---

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Storing access token in state only — lost on refresh | Restore from refresh-token cookie on mount |
| Forgetting `isLoading` — flash of unauthenticated UI | Set `isLoading: true` initially, set false after restore |
| Re-creating `login`/`logout` on every render | Wrap with `useCallback` |
| Single monolithic context — auth + preferences + theme | Split into focused contexts |

---

## Interview Questions

1. **Why not use Redux/Zustand for auth state?** You can, but Context is sufficient for auth since the update frequency is very low and the tree is small. Context avoids an extra dependency for a simple global value.
2. **How do you handle token expiry while the user is active?** Use an Axios/fetch interceptor that detects 401 responses, calls `/api/auth/refresh`, and retries the original request transparently.
3. **What is the `isLoading` flag for?** Prevents the app from rendering a "not logged in" flash before the async session restoration completes.', 'intermediate', '["context","auth","provider","jwt","useContext","session"]', datetime('now'), datetime('now'));

INSERT INTO study_topics (category, topic, title, summary, body_md, difficulty, tags, created_at, updated_at) VALUES
('react', 'protected-routes', 'Protected Routes', 'Route-level access control in React: redirect unauthenticated users, enforce role-based access, and prevent flash of protected content.', '## Protected Routes

A protected route renders its children only when the user meets the access criteria; otherwise it redirects.

---

## Basic Pattern (React Router v6)

```tsx
// src/components/ProtectedRoute.tsx
import { Navigate, Outlet, useLocation } from ''react-router-dom''
import { useAuth } from ''@/auth/AuthContext''

interface Props {
  allowedRoles?: string[]
}

export function ProtectedRoute({ allowedRoles }: Props) {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <FullPageSpinner />

  if (!user) {
    // Preserve the intended destination so login can redirect back
    return <Navigate to=''/login'' state={{ from: location }} replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to=''/403'' replace />
  }

  return <Outlet />
}
```

```tsx
// src/router.tsx
import { createBrowserRouter } from ''react-router-dom''

export const router = createBrowserRouter([
  {
    path: ''/'',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: ''login'', element: <LoginPage /> },
      {
        element: <ProtectedRoute />,  // guards all children
        children: [
          { path: ''dashboard'', element: <Dashboard /> },
          { path: ''profile'', element: <Profile /> },
        ],
      },
      {
        element: <ProtectedRoute allowedRoles={[''admin'']} />,
        children: [
          { path: ''admin'', element: <AdminPanel /> },
        ],
      },
    ],
  },
])
```

---

## Redirect-After-Login

```tsx
// LoginPage.tsx — redirect to the originally intended page
function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: Location })?.from?.pathname ?? ''/dashboard''

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    await login(email, password)
    navigate(from, { replace: true })
  }
  // ...
}
```

---

## Next.js App Router Alternative

In Next.js, use middleware for server-side protection:

```ts
// middleware.ts (runs on Edge)
import { clerkMiddleware, createRouteMatcher } from ''@clerk/nextjs/server''

const isPrivate = createRouteMatcher([''/dashboard(.*)'', ''/admin(.*)''])

export default clerkMiddleware((auth, req) => {
  if (isPrivate(req)) auth().protect()
})

export const config = { matcher: [''/((?!_next|.*\\..*).*)'' ] }
```

Client-side component guard for additional role checks:

```tsx
// app/admin/layout.tsx
import { auth } from ''@clerk/nextjs/server''
import { redirect } from ''next/navigation''

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId, sessionClaims } = auth()
  if (!userId || sessionClaims?.role !== ''admin'') redirect(''/'')
  return <>{children}</>
}
```

---

## Interview Questions

1. **Why use `replace` in `<Navigate replace>`?** So pressing "back" from the login page does not return to the protected page that triggered the redirect.
2. **How do you prevent a flash of protected content?** Keep `isLoading: true` in AuthContext until session restoration completes — render a spinner instead of the protected content.
3. **What is the difference between client-side and server-side route protection?** Client-side only prevents rendering; the data is still accessible via direct API calls. Server-side (middleware/server components) enforces access before any response is sent.', 'intermediate', '["routing","react-router","Next.js","protected routes","RBAC","redirect"]', datetime('now'), datetime('now'));

INSERT INTO study_topics (category, topic, title, summary, body_md, difficulty, tags, created_at, updated_at) VALUES
('react', 'token-storage', 'Token Storage Strategies', 'Where to store JWTs in the browser — localStorage, sessionStorage, httpOnly cookies, and in-memory — with the security tradeoffs of each.', '## Token Storage Strategies

Where a token lives determines what attacks can steal it.

---

## Options Compared

| Strategy | XSS | CSRF | Persists across tabs | Survives page reload |
|----------|-----|------|----------------------|----------------------|
| `localStorage` | Vulnerable | Safe | Yes | Yes |
| `sessionStorage` | Vulnerable | Safe | No | No |
| httpOnly cookie | **Safe** | Vulnerable (needs CSRF token) | Yes | Yes |
| In-memory (module var) | **Safe** | Safe | No | No |

---

## localStorage / sessionStorage

```ts
// Store
localStorage.setItem(''access_token'', token)

// Read
const token = localStorage.getItem(''access_token'')

// Remove
localStorage.removeItem(''access_token'')
```

**XSS risk:** Any injected script on your origin can read `localStorage`. One XSS vulnerability = all tokens stolen.

Only acceptable when your CSP is strict enough to prevent any inline script execution and you have no third-party scripts.

---

## httpOnly Cookie

Set by the server, invisible to JavaScript:

```http
Set-Cookie: refresh_token=<value>; HttpOnly; Secure; SameSite=Strict; Path=/api/auth
```

The browser attaches it automatically but JS cannot read or steal it — XSS cannot exfiltrate it.

**CSRF risk:** Any site can trigger a GET/POST to your API if the user is authenticated. Mitigate with:
- `SameSite=Strict` (blocks cross-origin requests entirely)
- CSRF double-submit pattern (sync token in cookie + header)

```ts
// Login handler — server sets httpOnly cookie, returns short-lived access token
app.post(''/api/auth/login'', async (req, res) => {
  const { accessToken, refreshToken } = await authenticate(req.body)
  res.cookie(''refresh_token'', refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: ''strict'',
    maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days
    path: ''/api/auth'',
  })
  res.json({ accessToken })
})
```

---

## In-Memory Storage

Store the access token in a module-level variable — never touches the DOM:

```ts
// src/auth/token-store.ts
let _accessToken: string | null = null

export const tokenStore = {
  get: () => _accessToken,
  set: (t: string | null) => { _accessToken = t },
  clear: () => { _accessToken = null },
}
```

```tsx
// In AuthContext
const login = async (email: string, password: string) => {
  const { accessToken } = await callLoginApi(email, password)
  tokenStore.set(accessToken)  // no localStorage — XSS cannot steal it
  // ... update state
}
```

**Downside:** Lost on page reload. Pair with an httpOnly refresh token cookie to silently restore on mount.

---

## Recommended Architecture (Best of Both)

```
Access token   → in-memory (module var)         — short TTL, XSS-safe
Refresh token  → httpOnly Secure SameSite=Strict cookie — XSS-safe, survives reload
```

On page load: call `/api/auth/refresh` (cookie sent automatically) → receive new access token → store in memory.

---

## Interview Questions

1. **Why is `localStorage` considered insecure for JWTs?** Any JavaScript executing on your origin (XSS, malicious npm package) can call `localStorage.getItem()`. httpOnly cookies are inaccessible to JS entirely.
2. **Does httpOnly eliminate CSRF?** No — add `SameSite=Strict` and/or CSRF tokens. `SameSite=Strict` is sufficient for most SPAs.
3. **Can you store the access token in an httpOnly cookie?** Yes, but then all API calls are stateful (cookie attached automatically) and you lose the ability to inspect the token client-side. In-memory access token + httpOnly refresh token is the preferred hybrid.', 'advanced', '["security","jwt","localStorage","httpOnly","cookies","XSS","CSRF","token storage"]', datetime('now'), datetime('now'));

INSERT INTO study_topics (category, topic, title, summary, body_md, difficulty, tags, created_at, updated_at) VALUES
('react', 'token-refresh', 'Silent Token Refresh', 'Keep users logged in without interruption by automatically renewing short-lived access tokens using a refresh token, typically via an Axios/fetch interceptor.', '## Silent Token Refresh

Access tokens should be short-lived (5–15 min). Silent refresh renews them transparently so users are never logged out mid-session.

---

## The Flow

```
1. User logs in  → receives access_token (5 min TTL) + refresh_token (httpOnly cookie, 7 days)
2. API call with Bearer access_token
3. Token expires → API returns 401
4. Interceptor catches 401 → calls POST /api/auth/refresh (cookie sent automatically)
5. Server validates refresh token → issues new access_token
6. Interceptor retries the original request with the new token
7. User never notices
```

---

## Axios Interceptor Implementation

```ts
// src/lib/api-client.ts
import axios from ''axios''
import { tokenStore } from ''@/auth/token-store''

export const apiClient = axios.create({ baseURL: ''/api'' })

// Attach access token to every request
apiClient.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let refreshPromise: Promise<string> | null = null

// On 401, refresh once and retry
apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }
    originalRequest._retry = true

    // Deduplicate concurrent refresh attempts
    if (!refreshPromise) {
      refreshPromise = fetch(''/api/auth/refresh'', {
        method: ''POST'',
        credentials: ''include'',
      })
        .then(async (res) => {
          if (!res.ok) throw new Error(''Refresh failed'')
          const { accessToken } = await res.json()
          tokenStore.set(accessToken)
          return accessToken
        })
        .finally(() => { refreshPromise = null })
    }

    try {
      const newToken = await refreshPromise
      originalRequest.headers.Authorization = `Bearer ${newToken}`
      return apiClient(originalRequest)
    } catch {
      tokenStore.clear()
      window.location.href = ''/login''
      return Promise.reject(error)
    }
  }
)
```

---

## Proactive Refresh (Before Expiry)

Instead of waiting for a 401, decode the token, check `exp`, and refresh 60 seconds early:

```ts
import { jwtDecode } from ''jwt-decode''

function scheduleRefresh(token: string) {
  const { exp } = jwtDecode<{ exp: number }>(token)
  const msUntilExpiry = exp * 1000 - Date.now()
  const refreshAt = msUntilExpiry - 60_000  // 60 s before expiry

  if (refreshAt <= 0) {
    // Already expired or about to — refresh now
    doRefresh()
    return
  }

  const timerId = setTimeout(doRefresh, refreshAt)
  return () => clearTimeout(timerId)  // cleanup function
}
```

Call `scheduleRefresh` whenever a new access token is received.

---

## Refresh Token Rotation

For security, issue a new refresh token on every refresh:

```
POST /api/auth/refresh
  → validates old refresh token
  → issues new access_token + new refresh_token (old one invalidated)
  → Sets new httpOnly cookie
```

If an attacker steals a refresh token and uses it, the next legitimate refresh will fail (token already rotated), alerting the server to invalidate the entire session.

---

## Interview Questions

1. **Why deduplicate concurrent refresh attempts?** If 3 requests fire simultaneously and all get 401, without deduplication you make 3 parallel refresh calls — potentially issuing 3 new refresh tokens and invalidating the previous ones.
2. **What happens if the refresh token itself expires?** Redirect to login. The user must authenticate again. This is the intended behavior.
3. **What is refresh token rotation and why does it matter?** Each use of a refresh token issues a new one and invalidates the old. If a stolen refresh token is ever used, the next legitimate use triggers a conflict, allowing the server to detect and terminate the compromised session.', 'advanced', '["jwt","refresh token","interceptor","axios","silent refresh","token rotation","security"]', datetime('now'), datetime('now'));

INSERT INTO study_topics (category, topic, title, summary, body_md, difficulty, tags, created_at, updated_at) VALUES
('react', 'auth-hooks', 'Custom Auth Hooks', 'Extract auth logic into composable hooks — useAuth, useUser, usePermissions, useRequireAuth — to keep components thin and testable.', '## Custom Auth Hooks

Thin, single-purpose hooks on top of AuthContext keep components clean and make auth logic independently testable.

---

## useAuth — Base Hook

```ts
// src/hooks/useAuth.ts
export { useAuth } from ''@/auth/AuthContext''
// Re-export so import path is consistent; implementation lives in AuthContext
```

---

## useUser — Typed User Access

```ts
// src/hooks/useUser.ts
import { useAuth } from ''@/auth/AuthContext''

export function useUser() {
  const { user, isLoading } = useAuth()
  return { user, isLoading, isAuthenticated: !!user }
}

// Usage
function ProfilePage() {
  const { user, isAuthenticated } = useUser()
  if (!isAuthenticated) return null
  return <h1>Hello, {user!.email}</h1>
}
```

---

## usePermissions — Role/Permission Checks

```ts
// src/hooks/usePermissions.ts
import { useAuth } from ''@/auth/AuthContext''

type Permission = ''read:jobs'' | ''write:jobs'' | ''manage:users''

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  admin: [''read:jobs'', ''write:jobs'', ''manage:users''],
  user:  [''read:jobs''],
}

export function usePermissions() {
  const { user } = useAuth()
  const permissions = user ? (ROLE_PERMISSIONS[user.role] ?? []) : []

  return {
    can: (p: Permission) => permissions.includes(p),
    cannot: (p: Permission) => !permissions.includes(p),
    isAdmin: user?.role === ''admin'',
  }
}

// Usage
function JobActions({ jobId }: { jobId: string }) {
  const { can } = usePermissions()
  return can(''write:jobs'') ? <EditButton jobId={jobId} /> : null
}
```

---

## useRequireAuth — Imperative Redirect

```ts
// src/hooks/useRequireAuth.ts
import { useEffect } from ''react''
import { useNavigate } from ''react-router-dom''
import { useAuth } from ''@/auth/AuthContext''

export function useRequireAuth(redirectTo = ''/login'') {
  const { user, isLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && !user) navigate(redirectTo, { replace: true })
  }, [user, isLoading, navigate, redirectTo])

  return { user, isLoading }
}

// Usage — simpler than wrapping with ProtectedRoute in some cases
function Dashboard() {
  const { user, isLoading } = useRequireAuth()
  if (isLoading) return <Spinner />
  return <h1>Welcome {user!.email}</h1>
}
```

---

## useLoginForm — Login State Machine

```ts
// src/hooks/useLoginForm.ts
import { useState } from ''react''
import { useAuth } from ''@/auth/AuthContext''

type Status = ''idle'' | ''loading'' | ''error''

export function useLoginForm() {
  const { login } = useAuth()
  const [status, setStatus] = useState<Status>(''idle'')
  const [error, setError] = useState<string | null>(null)

  const submit = async (email: string, password: string) => {
    setStatus(''loading'')
    setError(null)
    try {
      await login(email, password)
      setStatus(''idle'')
    } catch (err) {
      setError(err instanceof Error ? err.message : ''Login failed'')
      setStatus(''error'')
    }
  }

  return { submit, status, error, isLoading: status === ''loading'' }
}
```

---

## Testing Hooks with renderHook

```tsx
// src/hooks/__tests__/usePermissions.test.tsx
import { renderHook } from ''@testing-library/react''
import { AuthContext } from ''@/auth/AuthContext''
import { usePermissions } from ''../usePermissions''

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthContext.Provider value={{
      user: { id: ''1'', email: ''a@b.com'', role: ''admin'' },
      accessToken: ''tok'',
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
    }}>
      {children}
    </AuthContext.Provider>
  )
}

test(''admin can manage:users'', () => {
  const { result } = renderHook(() => usePermissions(), { wrapper })
  expect(result.current.can(''manage:users'')).toBe(true)
})
```

---

## Interview Questions

1. **Why split useUser and useAuth?** Single-responsibility — `useUser` exposes only user identity, keeping API surface minimal for components that just need to know who is logged in.
2. **How do you test hooks that depend on auth context?** Use `renderHook` from `@testing-library/react` with a custom `wrapper` that provides a mocked `AuthContext.Provider`.
3. **What is the benefit of `usePermissions` over checking `user.role` directly in components?** Centralises the role→permission mapping. When permissions change, you update one place instead of every component.', 'intermediate', '["hooks","auth","permissions","RBAC","useContext","testing","custom hooks"]', datetime('now'), datetime('now'));

INSERT INTO study_topics (category, topic, title, summary, body_md, difficulty, tags, created_at, updated_at) VALUES
('react', 'oauth-pkce', 'OAuth 2.0 / PKCE Flow', 'How the Authorization Code + PKCE flow works in a React SPA — from redirect through token exchange — and why it replaced the implicit flow.', '## OAuth 2.0 / PKCE Flow

OAuth 2.0 delegates authentication to a trusted provider (Google, GitHub, etc.). SPAs use **Authorization Code + PKCE** (Proof Key for Code Exchange) — the implicit flow was deprecated in 2019.

---

## Why PKCE?

The Authorization Code flow issues a short-lived `code` instead of a token directly. PKCE adds a cryptographic challenge so the code is useless if intercepted:

```
code_verifier  → random 43–128 char string (kept secret in memory)
code_challenge → BASE64URL(SHA256(code_verifier))  (sent to auth server)
```

Only the original client that generated the verifier can exchange the code — even if an attacker intercepts the redirect with the code, they cannot exchange it without the verifier.

---

## Full Flow

```
Browser                           Auth Server
  │                                    │
  │── 1. Redirect to /authorize ──────>│
  │   ?response_type=code              │
  │   &client_id=...                   │
  │   &redirect_uri=...                │
  │   &code_challenge=<hash>           │
  │   &code_challenge_method=S256      │
  │   &state=<csrf-token>              │
  │                                    │
  │<─── 2. User logs in ──────────────│
  │<─── 3. Redirect back with code ───│
  │   ?code=...&state=...              │
  │                                    │
  │── 4. POST /token ─────────────────>│
  │   code + code_verifier             │
  │                                    │
  │<─── 5. access_token + id_token ───│
```

---

## React Implementation

```ts
// src/auth/pkce.ts
export function generatePKCE() {
  const verifier = crypto.randomUUID().repeat(3).slice(0, 64)
  const encoded = new TextEncoder().encode(verifier)
  return crypto.subtle.digest(''SHA-256'', encoded).then((hash) => {
    const challenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
      .replace(/\+/g, ''-'').replace(/\//g, ''_'').replace(/=/g, '''')
    return { verifier, challenge }
  })
}

export function buildAuthUrl(challenge: string) {
  const params = new URLSearchParams({
    response_type: ''code'',
    client_id: import.meta.env.VITE_OAUTH_CLIENT_ID,
    redirect_uri: `${window.location.origin}/auth/callback`,
    scope: ''openid email profile'',
    code_challenge: challenge,
    code_challenge_method: ''S256'',
    state: crypto.randomUUID(),  // CSRF protection
  })
  return `${import.meta.env.VITE_OAUTH_ISSUER}/authorize?${params}`
}
```

```tsx
// src/pages/Login.tsx
async function handleOAuthLogin() {
  const { verifier, challenge } = await generatePKCE()
  sessionStorage.setItem(''pkce_verifier'', verifier)
  window.location.href = buildAuthUrl(challenge)
}
```

```tsx
// src/pages/AuthCallback.tsx — handles the redirect
import { useEffect } from ''react''
import { useNavigate, useSearchParams } from ''react-router-dom''
import { useAuth } from ''@/auth/AuthContext''

export function AuthCallback() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { exchangeCode } = useAuth()

  useEffect(() => {
    const code = params.get(''code'')
    const verifier = sessionStorage.getItem(''pkce_verifier'')
    if (!code || !verifier) { navigate(''/login''); return }

    sessionStorage.removeItem(''pkce_verifier'')
    exchangeCode(code, verifier)
      .then(() => navigate(''/dashboard''))
      .catch(() => navigate(''/login?error=oauth_failed''))
  }, [])  // runs once on mount

  return <FullPageSpinner />
}
```

---

## ID Token vs Access Token

OAuth 2.0 issues an **access token** (for API calls). OpenID Connect adds an **ID token** (JWT with user identity claims for the client to read).

```ts
import { jwtDecode } from ''jwt-decode''

interface IdTokenClaims {
  sub: string
  email: string
  name: string
  picture: string
}

const claims = jwtDecode<IdTokenClaims>(idToken)
// Use claims to populate user state — do NOT use the id_token as an API Bearer token
```

---

## Interview Questions

1. **Why was the implicit flow deprecated?** It returned the access token directly in the URL fragment — visible in browser history, referrer headers, and server logs. PKCE solves this without requiring a client secret.
2. **What does the `state` parameter protect against?** CSRF attacks. Generate a random value, store it in `sessionStorage`, and verify it matches when the redirect comes back before exchanging the code.
3. **Should a SPA ever store a client secret?** No — SPAs are public clients. The secret would be visible in the JavaScript bundle. PKCE is specifically designed for public clients.', 'advanced', '["OAuth","PKCE","OpenID Connect","authorization code","security","JWT","social login"]', datetime('now'), datetime('now'));

INSERT INTO study_topics (category, topic, title, summary, body_md, difficulty, tags, created_at, updated_at) VALUES
('react', 'clerk-auth', 'Clerk Auth Integration', 'Clerk is a drop-in auth provider for Next.js and React. It handles JWTs, sessions, social login, MFA, and organisations — with both client and server-side APIs.', '## Clerk Auth Integration

Clerk manages auth infrastructure (tokens, sessions, user management, MFA) so you focus on the app.

---

## Setup

```bash
pnpm add @clerk/nextjs
```

```ts
// .env.local
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

```tsx
// app/layout.tsx
import { ClerkProvider } from ''@clerk/nextjs''

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
```

---

## Middleware (Route Protection)

```ts
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from ''@clerk/nextjs/server''

const isPrivate = createRouteMatcher([
  ''/dashboard(.*)'',
  ''/api/graphql'',
])

export default clerkMiddleware((auth, req) => {
  if (isPrivate(req)) auth().protect()
})

export const config = {
  matcher: [''/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)'' , ''/(api|trpc)(.*)''],
}
```

---

## Client-Side Hooks

```tsx
import { useUser, useAuth, useClerk } from ''@clerk/nextjs''

function Header() {
  const { user, isLoaded, isSignedIn } = useUser()
  const { signOut } = useClerk()

  if (!isLoaded) return <Spinner />

  return isSignedIn ? (
    <div>
      <img src={user.imageUrl} alt={user.fullName ?? ''''} />
      <span>{user.primaryEmailAddress?.emailAddress}</span>
      <button onClick={() => signOut()}>Sign out</button>
    </div>
  ) : (
    <SignInButton />
  )
}
```

```tsx
// Get JWT for API calls
function useApiToken() {
  const { getToken } = useAuth()
  return () => getToken()  // Returns current session JWT; refreshes automatically
}
```

---

## Server-Side (App Router)

```ts
// app/api/graphql/route.ts
import { auth, currentUser } from ''@clerk/nextjs/server''

export async function POST(req: Request) {
  const { userId, sessionClaims } = auth()

  if (!userId) {
    return new Response(''Unauthorized'', { status: 401 })
  }

  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress

  // Pass to GraphQL context
  return handleGraphQL(req, { userId, userEmail: email })
}
```

---

## Custom JWT Claims (Metadata → Token)

Add custom claims to the JWT via Clerk''s session token template:

```json
// Clerk Dashboard → Sessions → JWT Templates
{
  "role": "{{user.public_metadata.role}}",
  "org_id": "{{org.id}}"
}
```

```ts
// Read in Next.js middleware / server
const { sessionClaims } = auth()
const role = sessionClaims?.role as string | undefined
```

---

## organisations and RBAC

```ts
import { useOrganization, useOrganizationList } from ''@clerk/nextjs''

function OrgSwitcher() {
  const { organization, membership } = useOrganization()
  const { userMemberships, setActive } = useOrganizationList({
    userMemberships: { infinite: true },
  })

  return (
    <select onChange={(e) => setActive({ organization: e.target.value })}>
      {userMemberships.data?.map((m) => (
        <option key={m.organization.id} value={m.organization.id}>
          {m.organization.name} ({m.role})
        </option>
      ))}
    </select>
  )
}
```

---

## Interview Questions

1. **What does Clerk store vs what does your app store?** Clerk stores user credentials, sessions, and MFA state. Your app stores user preferences, application data, and any custom profile fields that are not part of Clerk''s user model.
2. **How do you add custom data (e.g., subscription tier) to the JWT?** Store it in `user.public_metadata` via the Clerk backend API, then add a JWT template in the Clerk Dashboard that reads `{{user.public_metadata.tier}}`.
3. **How does Clerk differ from Auth.js (NextAuth)?** Clerk is a hosted service with a UI — it manages the auth UI, email delivery, and MFA out of the box. Auth.js is a library you self-configure with providers and adapters; more flexible but more setup.', 'intermediate', '["clerk","Next.js","authentication","JWT","session","middleware","RBAC","organizations"]', datetime('now'), datetime('now'));
