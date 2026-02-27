INSERT INTO study_topics (category, topic, title, summary, body_md, difficulty, tags, created_at, updated_at) VALUES
('react', 'use-callback', 'useCallback', 'useCallback caches a function between renders. Use it to stabilise a callback passed to memoised child components or used as an effect dependency.', '## useCallback

```tsx
const cachedFn = useCallback(fn, [dependencies])
```

Returns the same function reference between renders unless a dependency changes.

---

## When to Use It

**Without useCallback:**
```tsx
function Parent() {
  const handleClick = () => doSomething() // new reference every render
  return <MemoChild onClick={handleClick} /> // memo is bypassed
}
```

**With useCallback:**
```tsx
function Parent() {
  const handleClick = useCallback(() => doSomething(), [])
  return <MemoChild onClick={handleClick} /> // stable reference -> memo works
}
```

Only useful when:
1. Passing to a component wrapped in `React.memo`
2. Used as a dependency in `useEffect` / `useMemo`
3. Passed to a hook that relies on referential stability

---

## useCallback vs useMemo

```tsx
// useCallback — caches the function itself
const fn = useCallback(() => compute(a, b), [a, b])

// useMemo — caches the return value of the function
const value = useMemo(() => compute(a, b), [a, b])

// Equivalent:
const fn = useMemo(() => () => compute(a, b), [a, b])
```

---

## Common Mistake

Wrapping every function in `useCallback` adds overhead without benefit unless the consumer is memoised:

```tsx
// bad: pointless — Heading is not memo-ised
const handleClick = useCallback(() => navigate(''/''), [])
return <Heading onClick={handleClick} />
```

---

## Interview Questions

1. **Does useCallback prevent re-renders?** Only indirectly — it stabilises a reference so `React.memo` or `useEffect` deps comparisons succeed.
2. **What is the cost?** Memory for the cached function + dependency comparison on every render.', 'intermediate', '["performance","memoization","referential stability","React.memo","callbacks"]', datetime('now'), datetime('now'));
INSERT INTO study_topics (category, topic, title, summary, body_md, difficulty, tags, created_at, updated_at) VALUES
('react', 'use-context', 'useContext', 'useContext reads and subscribes to a context created with createContext. Any component in the tree can read context without prop drilling.', '## useContext

```tsx
const value = useContext(MyContext)
```

---

## Setup

```tsx
// 1. Create context
const ThemeContext = createContext<''light'' | ''dark''>(''light'')

// 2. Provide it
function App() {
  return (
    <ThemeContext.Provider value="dark">
      <Tree />
    </ThemeContext.Provider>
  )
}

// 3. Consume it anywhere below
function Button() {
  const theme = useContext(ThemeContext)
  return <button className={theme}>Click</button>
}
```

---

## Re-renders

A component re-renders whenever the context *value* changes (by `Object.is` comparison). To avoid unnecessary re-renders when providing objects:

```tsx
// bad: new object every render -> all consumers re-render
<Ctx.Provider value={{ user, setUser }}>

// good: memoised
const ctxValue = useMemo(() => ({ user, setUser }), [user])
<Ctx.Provider value={ctxValue}>
```

---

## Context vs State vs Redux

| | Context | useState/useReducer | Redux / Zustand |
|---|---|---|---|
| Scope | Component subtree | Local component | Global |
| Perf | Re-renders all consumers | Local re-render | Selector-based |
| Best for | Theme, locale, auth | Local UI state | Complex global state |

---

## Common Interview Questions

1. **Does useContext cause unnecessary re-renders?** Yes, if the provider value changes reference every render. Memoize the value object.
2. **Can you have multiple contexts?** Yes — nest multiple providers.
3. **When NOT to use context?** When data changes frequently (e.g. cursor position) — prefer local state or a dedicated store with selectors.', 'beginner', '["context","prop drilling","provider","re-render","global state"]', datetime('now'), datetime('now'));
INSERT INTO study_topics (category, topic, title, summary, body_md, difficulty, tags, created_at, updated_at) VALUES
('react', 'use-debug-value', 'useDebugValue', 'useDebugValue displays a label for a custom hook in React DevTools, making it easier to inspect hook state during debugging.', '## useDebugValue

```tsx
useDebugValue(value)
useDebugValue(value, format) // format called lazily only when DevTools is open
```

Only for use inside **custom hooks** — not inside components.

---

## Usage

```tsx
function useAuth() {
  const [user, setUser] = useState<User | null>(null)

  // Appears in DevTools as: "useAuth: Vadim (admin)"
  useDebugValue(user, (u) => u ? `${u.name} (${u.role})` : ''Not logged in'')

  return { user, setUser }
}
```

Without `useDebugValue`, DevTools shows raw state values which may be hard to interpret.

---

## Format Function (Lazy)

The second argument is called **only when DevTools is open**, so expensive formatting does not affect production performance:

```tsx
useDebugValue(date, (d) => d.toISOString()) // toISOString only called in DevTools
```

---

## When to Use It

- Custom hooks you publish as a library
- Complex hooks where the raw state value is opaque (tokens, dates, encoded data)
- Not worth adding for simple hooks — DevTools shows primitive state clearly already

---

## Interview Questions

1. **Does useDebugValue affect production?** The label always evaluates, but the format function is lazy. For expensive formatting, always provide the format function.
2. **Can you use it in a component?** Technically yes, but it is meant for custom hooks — DevTools associates it with the hook name.', 'beginner', '["DevTools","debugging","custom hooks","development"]', datetime('now'), datetime('now'));
INSERT INTO study_topics (category, topic, title, summary, body_md, difficulty, tags, created_at, updated_at) VALUES
('react', 'use-deferred-value', 'useDeferredValue', 'useDeferredValue defers updating a part of the UI. The deferred value lags behind the real value, letting React prioritise urgent updates first. React 18+.', '## useDeferredValue

```tsx
const deferredValue = useDeferredValue(value)
```

Returns a version of `value` that may lag behind during concurrent rendering.

---

## Use Case

When you receive a value you don''t control (from props or context) and want to defer an expensive render that depends on it:

```tsx
function SearchResults({ query }: { query: string }) {
  const deferredQuery = useDeferredValue(query)
  // deferredQuery may be an older version of query during typing

  const results = useMemo(
    () => expensiveFilter(data, deferredQuery),
    [deferredQuery]
  )

  const isStale = deferredQuery !== query

  return (
    <div style={{ opacity: isStale ? 0.7 : 1 }}>
      <ResultsList results={results} />
    </div>
  )
}
```

---

## useDeferredValue vs useTransition

| | useDeferredValue | useTransition |
|---|---|---|
| You control the setter? | No (prop/context) | Yes |
| Wraps | The value consumer | The state update |
| Signature | `const d = useDeferredValue(v)` | `const [p, start] = useTransition()` |

---

## With Suspense

Deferred values work well with Suspense — React shows the old content while the new content loads:

```tsx
<Suspense fallback={<Spinner />}>
  <SearchResults query={deferredQuery} />
</Suspense>
```

---

## Interview Questions

1. **Is it debouncing?** No — debouncing uses timers. `useDeferredValue` uses React''s scheduler and is aware of rendering priority.
2. **When does the deferred value update?** When React has spare time after completing urgent renders.', 'advanced', '["concurrent","performance","React 18","Suspense","deferred rendering"]', datetime('now'), datetime('now'));
INSERT INTO study_topics (category, topic, title, summary, body_md, difficulty, tags, created_at, updated_at) VALUES
('react', 'use-effect', 'useEffect', 'useEffect synchronises a component with an external system. It runs after every render by default, or only when specified dependencies change.', '## useEffect

```tsx
useEffect(() => {
  // setup
  return () => { /* cleanup */ }
}, [dependencies])
```

---

## When It Runs

| Dependencies | Runs |
|---|---|
| Omitted | After every render |
| `[]` | Once after mount |
| `[a, b]` | After mount + when `a` or `b` change |

---

## Cleanup

Return a function to clean up subscriptions, timers, or event listeners:

```tsx
useEffect(() => {
  const sub = store.subscribe(handler)
  return () => sub.unsubscribe()
}, [store])
```

Cleanup runs before the next effect and on unmount.

---

## Dependency Array Rules

Every reactive value used inside the effect must be in the array:

```tsx
useEffect(() => {
  document.title = `${count} items` // count is reactive
}, [count]) // listed
```

Use the `eslint-plugin-react-hooks` exhaustive-deps rule to catch mistakes.

---

## Common Pitfalls

**Infinite loop** — updating state inside an effect without a dependency guard:
```tsx
useEffect(() => {
  setCount(count + 1) // runs -> re-render -> runs -> ...
}) // missing []
```

**Stale closure** — referencing a value not in the deps array:
```tsx
useEffect(() => {
  const id = setInterval(() => console.log(count), 1000)
  return () => clearInterval(id)
}, []) // count is stale, always logs initial value
```

---

## Data Fetching Pattern

```tsx
useEffect(() => {
  let cancelled = false
  async function load() {
    const data = await fetchUser(userId)
    if (!cancelled) setUser(data)
  }
  load()
  return () => { cancelled = true }
}, [userId])
```

---

## useEffect vs useLayoutEffect

- `useEffect` — runs asynchronously after the browser paints (non-blocking)
- `useLayoutEffect` — runs synchronously before the browser paints (use for DOM measurements)', 'beginner', '["side effects","lifecycle","cleanup","data fetching","subscriptions"]', datetime('now'), datetime('now'));
INSERT INTO study_topics (category, topic, title, summary, body_md, difficulty, tags, created_at, updated_at) VALUES
('react', 'use-id', 'useId', 'useId generates a unique, stable ID that is consistent between server and client renders. Use it to associate form labels with inputs without hydration mismatches. React 18+.', '## useId

```tsx
const id = useId()
```

Generates a stable, unique string like `:r0:` that is the same on server and client.

---

## The Problem It Solves

Generating IDs with `Math.random()` or a counter causes hydration mismatches (server and client produce different IDs):

```tsx
// bad: different on server vs client -> hydration error
const id = `input-${Math.random()}`

// good: same on both
const id = useId()
```

---

## Common Usage

```tsx
function FormField({ label }: { label: string }) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input id={id} />
    </div>
  )
}
```

For multiple related IDs in one component, append a suffix:

```tsx
const id = useId()
// id = ":r0:"
const nameId = `${id}-name`   // ":r0:-name"
const emailId = `${id}-email` // ":r0:-email"
```

---

## Rules

- Do **not** use as a list key — keys must be derived from your data
- Do **not** use for CSS selectors in stylesheets (the format may change)
- One `useId()` call per component; extend with suffixes for multiple IDs

---

## Interview Questions

1. **Why not just use a global counter?** Global counters reset between server and client, causing hydration mismatches. `useId` is tied to the component tree position, which is identical on both sides.
2. **When was useId introduced?** React 18.', 'intermediate', '["accessibility","SSR","hydration","forms","React 18"]', datetime('now'), datetime('now'));
INSERT INTO study_topics (category, topic, title, summary, body_md, difficulty, tags, created_at, updated_at) VALUES
('react', 'use-imperative-handle', 'useImperativeHandle', 'useImperativeHandle customises the instance value (ref) exposed to parent components when using forwardRef. Use it to expose a limited API instead of the full DOM node.', '## useImperativeHandle

```tsx
useImperativeHandle(ref, () => ({
  focus() { inputRef.current?.focus() },
  clear() { inputRef.current!.value = '''' },
}), [])
```

---

## Full Pattern

```tsx
interface InputHandle {
  focus: () => void
  clear: () => void
}

const FancyInput = forwardRef<InputHandle, Props>((props, ref) => {
  const inputRef = useRef<HTMLInputElement>(null)

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    clear: () => { if (inputRef.current) inputRef.current.value = '''' },
  }), [])

  return <input ref={inputRef} {...props} />
})

// Parent
const handle = useRef<InputHandle>(null)
<FancyInput ref={handle} />
<button onClick={() => handle.current?.focus()}>Focus</button>
```

---

## Why Limit the API?

Exposing the raw DOM node lets parents do anything (mutate styles, read internal values). `useImperativeHandle` restricts the surface to what you explicitly allow, keeping the component API intentional.

---

## When to Use It

- Component libraries exposing focus/scroll/animate APIs
- Wrapping third-party DOM libraries
- Exposing play/pause on a video component

Avoid it for data that could be passed via props/callbacks — imperative APIs should be the last resort.

---

## Interview Questions

1. **Why does useImperativeHandle require forwardRef?** It customises the value seen via a `ref` prop — which only works when the ref is forwarded into the component.
2. **What does the dependency array do?** Like `useMemo`, it controls when the handle object is recomputed.', 'advanced', '["refs","forwardRef","imperative API","component design","encapsulation"]', datetime('now'), datetime('now'));
INSERT INTO study_topics (category, topic, title, summary, body_md, difficulty, tags, created_at, updated_at) VALUES
('react', 'use-insertion-effect', 'useInsertionEffect', 'useInsertionEffect fires before any DOM mutations, specifically for CSS-in-JS libraries to inject styles before layout effects read them. React 18+.', '## useInsertionEffect

```tsx
useInsertionEffect(() => {
  // inject styles here
}, [dependencies])
```

---

## Execution Order

```
useInsertionEffect  -> before DOM mutations
useLayoutEffect     -> after DOM mutations, before paint
useEffect           -> after paint
```

---

## Who Should Use It

**CSS-in-JS library authors only.** Application code should not use `useInsertionEffect`.

It solves a specific problem: if a `useLayoutEffect` reads layout (e.g. `getBoundingClientRect`) before a style is injected, it gets wrong measurements. `useInsertionEffect` runs first, ensuring styles are present.

---

## Example (Library Code)

```tsx
// Inside a CSS-in-JS library
function useStyles(css: string) {
  useInsertionEffect(() => {
    if (!document.querySelector(`[data-style="${hash(css)}"]`)) {
      const style = document.createElement(''style'')
      style.dataset.style = hash(css)
      style.textContent = css
      document.head.appendChild(style)
    }
  }, [css])
}
```

---

## Limitations

- No access to refs (DOM not yet mutated)
- No state updates
- Runs on every render where deps change — keep it fast

---

## Interview Questions

1. **Why not just use useLayoutEffect for style injection?** Layout effects can read layout before styles are applied, causing one frame of wrong measurements. `useInsertionEffect` guarantees styles are injected first.
2. **Should I use this in my app?** No — only CSS-in-JS library maintainers need it. Use plain CSS, CSS Modules, or Tailwind in application code.', 'advanced', '["CSS-in-JS","styles","React 18","library authoring","timing"]', datetime('now'), datetime('now'));
INSERT INTO study_topics (category, topic, title, summary, body_md, difficulty, tags, created_at, updated_at) VALUES
('react', 'use-layout-effect', 'useLayoutEffect', 'useLayoutEffect fires synchronously after all DOM mutations but before the browser paints. Use it to read layout and synchronously re-render before the user sees anything.', '## useLayoutEffect

```tsx
useLayoutEffect(() => {
  // runs synchronously after DOM mutations, before paint
  return () => { /* cleanup */ }
}, [dependencies])
```

---

## useEffect vs useLayoutEffect

| | useEffect | useLayoutEffect |
|---|---|---|
| Timing | After browser paint (async) | Before browser paint (sync) |
| Blocks paint? | No | Yes |
| Default choice | Yes | Only when needed |
| SSR | Runs normally | Warning on server |

---

## When to Use It

- **Reading layout** — measuring element dimensions/position and immediately adjusting them
- **Avoiding flash** — if an element briefly shows in the wrong position before an effect corrects it

```tsx
function Tooltip({ target }: { target: DOMRect }) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useLayoutEffect(() => {
    const rect = ref.current!.getBoundingClientRect()
    // compute position relative to target
    setPos({ top: target.bottom, left: target.left - rect.width / 2 })
  }, [target])

  return <div ref={ref} style={pos}>...</div>
}
```

---

## SSR Warning

`useLayoutEffect` cannot run on the server. Next.js / React will warn. Options:
1. Use `useEffect` if flicker is acceptable
2. Guard: `const isClient = typeof window !== ''undefined''`
3. Use dynamic import with `ssr: false`

---

## Interview Questions

1. **Why is useLayoutEffect synchronous?** It runs in the same phase as class `componentDidMount`/`componentDidUpdate`, before the browser has a chance to paint.
2. **When does the warning appear?** When a component with `useLayoutEffect` renders on the server (SSR/RSC).', 'advanced', '["DOM","layout","paint","SSR","timing"]', datetime('now'), datetime('now'));
INSERT INTO study_topics (category, topic, title, summary, body_md, difficulty, tags, created_at, updated_at) VALUES
('react', 'use-memo', 'useMemo', 'useMemo caches the result of an expensive calculation between renders. It recomputes only when listed dependencies change.', '## useMemo

```tsx
const cachedValue = useMemo(() => computeExpensive(a, b), [a, b])
```

---

## When to Use It

1. **Expensive computations** — filtering/sorting large lists, complex derived data
2. **Stable object references** — to avoid unnecessary child re-renders or effect re-runs

```tsx
// bad: new array every render -> child always re-renders
const filtered = items.filter(i => i.active)

// good: stable reference until items or query change
const filtered = useMemo(
  () => items.filter(i => i.active && i.name.includes(query)),
  [items, query]
)
```

---

## useMemo vs useCallback

```tsx
useMemo(() => value, deps)    // caches a value
useCallback(fn, deps)         // caches a function (shorthand for useMemo(() => fn, deps))
```

---

## When NOT to Use It

- Cheap calculations (addition, simple string ops) — the memoisation overhead costs more than the compute
- Values not passed to memoised children or effect deps — the cache is never leveraged

**Rule of thumb:** profile first, optimise second.

---

## Derived State Pattern

```tsx
// Instead of keeping sorted list in state (sync issues):
const [items, setItems] = useState(rawItems)
const sorted = useMemo(
  () => [...items].sort((a, b) => a.name.localeCompare(b.name)),
  [items]
)
```

---

## Interview Questions

1. **Is useMemo always faster?** No — memoisation has memory and comparison costs. Measure before using.
2. **Does React guarantee useMemo?** No — React may discard cached values (e.g. off-screen). Don''t use it for side effects.', 'intermediate', '["performance","memoization","derived state","expensive computation","optimization"]', datetime('now'), datetime('now'));
INSERT INTO study_topics (category, topic, title, summary, body_md, difficulty, tags, created_at, updated_at) VALUES
('react', 'use-reducer', 'useReducer', 'useReducer manages complex state transitions through a reducer function. Prefer it over useState when next state depends on previous state via multi-step logic.', '## useReducer

```tsx
const [state, dispatch] = useReducer(reducer, initialState)
```

---

## Reducer Pattern

```tsx
type Action =
  | { type: ''increment'' }
  | { type: ''decrement'' }
  | { type: ''reset''; payload: number }

function reducer(state: number, action: Action): number {
  switch (action.type) {
    case ''increment'': return state + 1
    case ''decrement'': return state - 1
    case ''reset'':     return action.payload
    default:           return state
  }
}

const [count, dispatch] = useReducer(reducer, 0)

dispatch({ type: ''increment'' })
dispatch({ type: ''reset'', payload: 10 })
```

---

## useState vs useReducer

| | useState | useReducer |
|---|---|---|
| Best for | Simple, independent values | Multiple sub-values, complex logic |
| Next state depends on prev | `.prev =>` updater | Natural — reducer receives current state |
| Testing | Hard to isolate | Reducer is a pure function — easy to unit test |
| Readability | Verbose with many setters | All transitions in one place |

---

## Lazy Initialisation

```tsx
const [state, dispatch] = useReducer(reducer, initialArg, init)
// state = init(initialArg) — computed once on mount
```

---

## With Context (Redux-lite pattern)

```tsx
const StateCtx = createContext(initialState)
const DispatchCtx = createContext<Dispatch<Action>>(() => {})

function Provider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  return (
    <StateCtx.Provider value={state}>
      <DispatchCtx.Provider value={dispatch}>
        {children}
      </DispatchCtx.Provider>
    </StateCtx.Provider>
  )
}
```

Separating state and dispatch contexts avoids re-renders in components that only dispatch.', 'intermediate', '["state management","reducer","actions","dispatch","patterns"]', datetime('now'), datetime('now'));
INSERT INTO study_topics (category, topic, title, summary, body_md, difficulty, tags, created_at, updated_at) VALUES
('react', 'use-ref', 'useRef', 'useRef returns a mutable ref object whose .current property persists across renders without causing re-renders. Used for DOM access and storing instance variables.', '## useRef

```tsx
const ref = useRef(initialValue)
// ref.current === initialValue (on first render)
```

---

## Two Main Uses

### 1. Accessing DOM Elements

```tsx
function TextInput() {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <>
      <input ref={inputRef} />
      <button onClick={() => inputRef.current?.focus()}>Focus</button>
    </>
  )
}
```

### 2. Storing Instance Variables (without re-render)

```tsx
function Timer() {
  const intervalRef = useRef<number | null>(null)

  function start() {
    intervalRef.current = setInterval(tick, 1000)
  }
  function stop() {
    clearInterval(intervalRef.current!)
  }
}
```

---

## ref vs state

| | useRef | useState |
|---|---|---|
| Triggers re-render? | No | Yes |
| Persists across renders? | Yes | Yes |
| Mutable? | Yes | No (via setter only) |
| When to use | DOM refs, timers, prev values | Displayed data |

---

## Storing Previous Value

```tsx
function usePrevious<T>(value: T) {
  const ref = useRef<T>(value)
  useEffect(() => { ref.current = value })
  return ref.current // value from previous render
}
```

---

## forwardRef

To expose a ref to a parent, wrap the component in `forwardRef`:

```tsx
const Input = forwardRef<HTMLInputElement, Props>((props, ref) => (
  <input ref={ref} {...props} />
))
```

---

## Interview Questions

1. **Why does mutating ref.current not trigger a re-render?** React does not track mutations to ref.current — only state and context changes schedule re-renders.
2. **When would you use useRef over a module-level variable?** Module-level vars are shared across all instances; refs are per-component-instance.', 'beginner', '["DOM","refs","instance variables","forwardRef","side effects"]', datetime('now'), datetime('now'));
INSERT INTO study_topics (category, topic, title, summary, body_md, difficulty, tags, created_at, updated_at) VALUES
('react', 'use-state', 'useState', 'useState adds local state to a function component. Returns a stateful value and a setter function that triggers a re-render when called.', '## useState

```tsx
const [state, setState] = useState(initialValue)
```

---

## How It Works

- `state` — current value
- `setState(newValue)` — schedules a re-render with the new value
- `initialValue` — evaluated once on mount; can be a function for lazy init

React batches multiple `setState` calls in event handlers (React 18 batches everywhere, including timeouts and promises).

---

## Functional Updates

When new state depends on old state, use the updater form to avoid stale closure bugs:

```tsx
// bad: stale — may miss intermediate updates
setCount(count + 1)

// good: always uses latest state
setCount(prev => prev + 1)
```

---

## Lazy Initialisation

If the initial value is expensive to compute, pass a function — React calls it only on the first render:

```tsx
const [state, setState] = useState(() => computeExpensiveValue())
```

---

## Object / Array State

React uses `Object.is` for comparison. Always return a new reference to trigger a re-render:

```tsx
// bad: mutating in place — no re-render
state.push(item)
setState(state)

// good: new array
setState(prev => [...prev, item])

// good: new object
setState(prev => ({ ...prev, key: newValue }))
```

---

## Resetting State with key

Mounting a component with a new `key` resets all its state:

```tsx
<Form key={userId} />
```

---

## Common Interview Questions

1. **Why does `setState` not update immediately?** It schedules a re-render; `state` refers to the value from the current render snapshot.
2. **When to use `useReducer` instead?** When next state depends on previous state via complex logic, or when multiple sub-values update together.
3. **What is batching?** React groups multiple state updates into a single re-render. React 18 batches in all contexts; React 17 only in event handlers.', 'beginner', '["state management","hooks","re-render","batching","lazy init"]', datetime('now'), datetime('now'));
INSERT INTO study_topics (category, topic, title, summary, body_md, difficulty, tags, created_at, updated_at) VALUES
('react', 'use-sync-external-store', 'useSyncExternalStore', 'useSyncExternalStore subscribes to an external store (Redux, Zustand, browser APIs) in a way that is safe for concurrent rendering. React 18+.', '## useSyncExternalStore

```tsx
const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot?)
```

- `subscribe(callback)` — called when the store changes; return an unsubscribe function
- `getSnapshot()` — returns current store value (must be the same object if unchanged)
- `getServerSnapshot()` — optional; snapshot for SSR

---

## Why It Exists

Before React 18, external store subscriptions via `useEffect` could tear — different components reading the same store at different times could see different values during a concurrent render. `useSyncExternalStore` eliminates this.

---

## Example: Browser Window Size

```tsx
function useWindowWidth() {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener(''resize'', cb)
      return () => window.removeEventListener(''resize'', cb)
    },
    () => window.innerWidth,
    () => 0 // server snapshot
  )
}
```

---

## Example: Custom Store

```tsx
let listeners: (() => void)[] = []
let state = { count: 0 }

const store = {
  getSnapshot: () => state,
  subscribe: (cb: () => void) => {
    listeners.push(cb)
    return () => { listeners = listeners.filter(l => l !== cb) }
  },
  increment() {
    state = { count: state.count + 1 }
    listeners.forEach(l => l())
  }
}

function Counter() {
  const { count } = useSyncExternalStore(store.subscribe, store.getSnapshot)
  return <button onClick={store.increment}>{count}</button>
}
```

---

## Interview Questions

1. **What is tearing?** When concurrent rendering reads a store at different points in time, producing inconsistent UI — some components show old values, others new ones.
2. **Does Zustand/Redux use this?** Yes — modern versions of both use `useSyncExternalStore` internally.', 'advanced', '["external store","concurrent","React 18","subscriptions","Redux","Zustand"]', datetime('now'), datetime('now'));
INSERT INTO study_topics (category, topic, title, summary, body_md, difficulty, tags, created_at, updated_at) VALUES
('react', 'use-transition', 'useTransition', 'useTransition marks state updates as non-urgent, letting React interrupt them to keep the UI responsive. Introduced in React 18.', '## useTransition

```tsx
const [isPending, startTransition] = useTransition()
```

- `isPending` — true while the transition is in progress
- `startTransition(fn)` — wrap non-urgent state updates

---

## The Problem It Solves

Large state updates (filtering a long list, navigating to a heavy page) can block the UI. Wrapping them in `startTransition` lets React prioritise urgent updates (typing, clicking) first.

```tsx
function SearchPage() {
  const [query, setQuery] = useState('''')
  const [results, setResults] = useState(data)
  const [isPending, startTransition] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value) // urgent — update input immediately

    startTransition(() => {
      setResults(filter(data, e.target.value)) // non-urgent — can be interrupted
    })
  }

  return (
    <>
      <input value={query} onChange={handleChange} />
      {isPending && <Spinner />}
      <ResultsList results={results} />
    </>
  )
}
```

---

## Rules

- Only state updates inside `startTransition` are deferred
- The wrapped function must be synchronous
- Cannot wrap updates from external sources (setTimeout, fetch) — use `useDeferredValue` instead

---

## useTransition vs useDeferredValue

| | useTransition | useDeferredValue |
|---|---|---|
| Controls | The update that produces new data | The consumption of new data |
| Use when | You own the state setter | You receive a prop/value you don''t control |

---

## Interview Questions

1. **What does "concurrent rendering" mean?** React can start rendering, pause, and resume or discard renders based on priority. `startTransition` opts in to this behaviour.
2. **Does it make renders faster?** No — it defers them. The same work happens, just later.', 'advanced', '["concurrent","performance","React 18","deferred","priority"]', datetime('now'), datetime('now'));
