## Ink + Streaming LLM Responses (2026-01-18)

**Result:** Validated. Streaming works smoothly.

**Findings:**

- 718 characters streamed flicker-free at both 50ms and 16ms intervals
- 50ms interval: very smooth, but slow (42s total)
- 16ms interval: slightly less smooth, still flicker-free, much faster
- Layout stability matters: adding `width="100%"` to container Box improved
  smoothness

**Recommendations:**

1. Use explicit widths on streaming containers (`width="100%"` or fixed)
2. 16-30ms intervals likely optimal for perceived speed vs smoothness
3. No buffering needed - Ink handles rapid updates well
4. Consider `useStdout` for responsive terminal width
