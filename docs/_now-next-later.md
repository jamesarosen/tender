# Now

- LLM-unavailable flow: app degrades to basic TODO tracking. Can still ask for
  and record reflections, but agent can't dig in on them.
- Add CHECK constraints with `json_valid()` to JSON columns (tags, recurrence,
  payload)

---

# Next

- Evals framework
- Continuously refine prioritization algorithm / prompt
- Identify patterns in agentic SQL. Write views, functions, macros to guide it
  to efficient, correct patterns.
- Conversation history persistence

# Later

- Backup / Recovery: daily checkpointing (copy db to timestamped file as first
  operation each day). Turso will also help here.
- Turso sync conflict resolution strategy (consider merging with Backup /
  Recovery)

---

# Decisions Log

Captured during risk review session:

| Topic           | Decision               | Rationale                                                  |
| --------------- | ---------------------- | ---------------------------------------------------------- |
| Prioritization  | Agent-driven via SQL   | Maximum flexibility, agent can adapt                       |
| SQL errors      | Fallback to safe query | Graceful degradation                                       |
| SQL guardrails  | Moderate               | Timeout (5s), row limit (1000), block dangerous functions  |
| LLM unavailable | Degrade to TODO app    | Core tracking works; reflections recorded but not analyzed |
| Blocker model   | Both FK + freeform     | Flexibility for linked tasks and notes                     |
| Ink streaming   | Use with layout care   | Works flicker-free; explicit widths improve smoothness     |
