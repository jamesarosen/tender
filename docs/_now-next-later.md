# Now

(nothing)

---

# Next

Pre-implementation spikes and schema updates identified during risk review.

## Spike on Ink + Streaming LLM Responses

**Risk:** Ink's React-based render model may not handle streaming text updates smoothly.

**Spike goal:** Validate that we can render streaming LLM output in Ink without flicker, excessive re-renders, or layout thrashing.

**Approach:**

1. Create minimal Ink app with a `<Text>` component
2. Simulate streaming by appending characters every 50ms
3. Test with multi-line responses and word wrapping
4. If problematic, explore:
   - Buffering (render every N characters)
   - ink-use-stdout-dimensions for responsive layouts
   - Custom streaming component

**Success criteria:** Smooth rendering of 500+ character streaming response.

## Agent Tools

### 3. Read-Only SQL Tool

Add tool for agent-driven prioritization:

```typescript
export const queryDatabase = tool({
  description: "Execute a read-only SQL query against the database",
  inputSchema: z.object({
    sql: z.string().describe("SELECT query to execute"),
  }),
  execute: async ({ sql }) => {
    // Validate: must start with SELECT (after trimming/normalizing)
    // Guardrails: 5s timeout, 1000 row limit
    // On error: return fallback "all due tasks" result
  },
});
```

**Prompt additions needed:**

- Full schema documentation in system prompt
- Example queries for common patterns
- Guidance on efficient query patterns

---

# Later

- Evals framework
- Continuously refine prioritization algorithm / prompt
- Identify patterns in agentic SQL. Write views, functions, macros to guide it
  to efficient, correct patterns.
- Support LLM unavailable. Queue interactions. LLM responds when it's back.

---

# Decisions Log

Captured during risk review session:

| Topic           | Decision               | Rationale                                                 |
| --------------- | ---------------------- | --------------------------------------------------------- |
| Prioritization  | Agent-driven via SQL   | Maximum flexibility, agent can adapt                      |
| SQL errors      | Fallback to safe query | Graceful degradation                                      |
| SQL guardrails  | Moderate               | Timeout (5s), row limit (1000), block dangerous functions |
| LLM unavailable | Queue interactions     | User can keep working, replay when available              |
| Blocker model   | Both FK + freeform     | Flexibility for linked tasks and notes                    |
