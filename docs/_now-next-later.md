# Now

(nothing)

---

# Next

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
| Ink streaming   | Use with layout care   | Works flicker-free; explicit widths improve smoothness    |
