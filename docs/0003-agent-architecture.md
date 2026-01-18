# Agent Architecture

## Overview

Tender includes an agentic LLM component that powers task prioritization, emotional check-ins, and gentle inquiry. The agent is called **Tender** — it _is_ the warm, supportive presence that helps users navigate their tasks.

```
┌─────────────────────────────────────────────┐
│               Tender Agent                   │
│  (LLM with instructions + tools)            │
├─────────────────────────────────────────────┤
│ Tools:                                       │
│  • getSuggestedTasks() → Task[]             │
│  • recordSignal(taskId, signal)             │
│  • getTaskHistory(taskId) → Signal[]        │
│  • getTemplatePatterns(templateId)          │
└─────────────────────────────────────────────┘
```

---

## Design Decisions

### Single Agent (for now)

We start with a single unified agent rather than multi-agent orchestration. The Tender agent handles:

- **Prioritization** — Suggesting which task to focus on next
- **Emotional check-ins** — Asking how the user feels before/after tasks
- **Gentle inquiry** — Exploring why tasks linger ("Is this too big? Unpleasant? Blocked?")
- **Pattern recognition** — Noticing avoidance behaviors, productive procrastination

#### When to Revisit This Decision

Consider splitting into specialized agents if:

1. **Prompt complexity explodes** — The system prompt exceeds ~2000 tokens or becomes hard to maintain
2. **Conflicting behaviors** — Tuning prioritization degrades emotional intelligence (or vice versa)
3. **Latency concerns** — Single agent calls become too slow; specialized agents could run in parallel
4. **Distinct tool sets** — Prioritization and inquiry need completely different tools with no overlap
5. **Testing difficulty** — Unit testing agent behavior becomes unwieldy with a single large prompt

If we split, likely candidates:

- **Prioritizer** — Focused on task ranking, avoidance detection, workload balance
- **Companion** — Focused on emotional check-ins, reflection, gentle inquiry

### Provider Abstraction

The architecture supports pluggable LLM providers via Vercel AI SDK's provider registry:

```typescript
import { createProviderRegistry } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

// Current: hard-coded Claude
export const registry = createProviderRegistry({
  anthropic,
});

export const defaultModel = registry.languageModel(
  "anthropic:claude-sonnet-4-20250514",
);
```

Future: user-provided keys and local inference:

```typescript
import { createProviderRegistry } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createOllama } from "ollama-ai-provider";

export function createRegistry(config: AgentConfig) {
  return createProviderRegistry({
    anthropic: createAnthropic({ apiKey: config.anthropicKey }),
    openai: createOpenAI({ apiKey: config.openaiKey }),
    ollama: createOllama({ baseURL: config.ollamaBaseUrl }),
  });
}
```

This enables:

- **Bring-your-own-key** — Users provide their own API keys
- **Local inference** — Ollama for complete data ownership
- **Provider switching** — Change models without code changes

### Tool Design

Tools use Zod schemas for type-safe input validation:

```typescript
import { tool } from "ai";
import { z } from "zod";

export const getSuggestedTasks = tool({
  description: "Get prioritized task suggestions for the user to focus on",
  inputSchema: z.object({
    limit: z.number().optional().describe("Maximum number of tasks to return"),
    excludeIds: z.array(z.string()).optional().describe("Task IDs to exclude"),
  }),
  execute: async ({ limit = 3, excludeIds = [] }) => {
    // Implementation calls domain layer
  },
});

export const recordSignal = tool({
  description: "Record an emotional or behavioral signal about a task",
  inputSchema: z.object({
    taskId: z.string().describe("The task this signal relates to"),
    kind: z.enum(["deferred", "feeling", "completed", "inquiry", "surfaced"]),
    payload: z.record(z.unknown()).optional(),
  }),
  execute: async ({ taskId, kind, payload }) => {
    // Implementation calls domain layer
  },
});
```

---

## Stack

| Component       | Technology         | Rationale                                    |
| --------------- | ------------------ | -------------------------------------------- |
| Agent framework | Vercel AI SDK      | TypeScript-native, provider-agnostic, mature |
| Schema          | Zod                | Type-safe tool inputs, already in our stack  |
| Default LLM     | Claude (Anthropic) | Strong reasoning, good at emotional nuance   |
| Future: local   | Ollama             | Local inference for data ownership           |

---

## Package Structure

```
packages/agent/
├── src/
│   ├── index.ts           # Public API
│   ├── registry.ts        # Provider registry setup
│   ├── tender.ts          # Main agent definition
│   ├── tools/
│   │   ├── index.ts
│   │   ├── tasks.ts       # Task-related tools
│   │   └── signals.ts     # Signal-related tools
│   ├── prompts/
│   │   └── system.ts      # System prompt
│   └── types.ts
├── package.json
└── tsconfig.json
```

### Dependencies

```
tui ── agent ── domain ── db
                  │
                  └── config
```

- `@tender/tui` depends on `@tender/agent` for conversational interactions
- `@tender/agent` depends on `@tender/domain` for business logic
- Tools call domain functions, not db directly
- Agent does not depend on TUI (can be used headless, e.g., for CLI commands or testing)

---

## Agent Definition

### System Prompt

The system prompt establishes Tender's personality and capabilities:

```typescript
export const systemPrompt = `You are Tender, a warm and supportive task companion.

Your role is to help users navigate their tasks with emotional intelligence:

- **Suggest** what to focus on next, balancing urgency with emotional readiness
- **Notice** patterns — when tasks linger, when users avoid certain types of work
- **Ask gently** about feelings before and after tasks
- **Celebrate** completions without being over the top
- **Inquire** when tasks are stuck: "Is this too big? Unpleasant? Blocked?"

Personality:
- Warm but not saccharine
- Curious, not judgmental
- Brief — 1-3 sentences typically
- Use tools to access task data; don't make assumptions

You have access to tools for reading tasks, recording signals, and understanding patterns.
`;
```

### Agent Configuration

```typescript
import { generateText, tool } from "ai";
import { systemPrompt } from "./prompts/system";
import { tools } from "./tools";
import { defaultModel } from "./registry";

export async function chat(messages: Message[]) {
  const result = await generateText({
    model: defaultModel,
    system: systemPrompt,
    messages,
    tools,
    maxSteps: 5, // Allow multi-step tool use
  });

  return result;
}
```

---

## TUI-Agent Integration

The TUI is the primary consumer of the agent. When users interact with tasks, the TUI translates their actions into agent conversations:

```
┌─────────┐    ┌─────────────┐    ┌──────────────┐    ┌──────────────┐
│   TUI   │    │    Agent    │    │    Domain    │    │      DB      │
└────┬────┘    └──────┬──────┘    └──────┬───────┘    └──────┬───────┘
     │                │                   │                   │
     │  User presses "skip" on task      │                   │
     │                │                   │                   │
     │  chat([                           │                   │
     │    { role: "user",                │                   │
     │      content: "Skip 'email        │                   │
     │      grandma'" }                  │                   │
     │  ])             │                   │                   │
     │────────────────►│                   │                   │
     │                │                   │                   │
     │                │  recordSignal()   │                   │
     │                │  (deferred)       │                   │
     │                │──────────────────►│                   │
     │                │                   │  INSERT signal    │
     │                │                   │──────────────────►│
     │                │                   │                   │
     │  "No problem.  │                   │                   │
     │◄───────────────│                   │                   │
     │   I'm curious — what's making     │                   │
     │   this one hard to start?"        │                   │
     │                │                   │                   │
     │  Display response, show input     │                   │
     │                │                   │                   │
     │  User types: "I don't have        │                   │
     │  grandma's new email"             │                   │
     │────────────────►│                   │                   │
     │                │                   │                   │
     │                │  recordSignal()   │                   │
     │                │  (inquiry)        │                   │
     │                │──────────────────►│                   │
     │                │                   │──────────────────►│
     │                │                   │                   │
     │  "Ah, a blocker! Would it help    │                   │
     │◄───────────────│                   │                   │
     │   to add 'get grandma's email'    │                   │
     │   as a separate task?"            │                   │
     │                │                   │                   │
```

### Key Points

- **TUI translates actions to conversation** — A "skip" button press becomes a chat message
- **Agent decides what to do** — It may just acknowledge, or it may ask a follow-up
- **Tools execute through domain** — Agent never touches DB directly
- **TUI displays responses** — Agent output is rendered in the terminal

### Message Construction

The TUI constructs messages that give the agent context:

```typescript
// In @tender/tui
async function handleSkipTask(task: Task) {
  const response = await agent.chat([
    ...conversationHistory,
    {
      role: "user",
      content: `Skip task: "${task.description}" (id: ${task.id})`,
    },
  ]);

  // Display agent's response
  setAgentMessage(response.text);

  // If agent asked a question, show input
  if (response.text.includes("?")) {
    setShowInput(true);
  }
}
```

---

## Interaction Patterns

### Task Suggestion Flow

```
User: "What should I work on?"
    │
    ▼
Tender calls getSuggestedTasks()
    │
    ▼
Tool returns prioritized tasks with context
    │
    ▼
Tender responds: "I'd suggest starting with [task].
                  It's been on your list for a while —
                  is there something making it hard to start?"
```

### Emotional Check-in Flow

```
User completes a task
    │
    ▼
TUI prompts: "How did that feel?"
    │
    ▼
User: "Relieved, actually"
    │
    ▼
Tender calls recordSignal(taskId, { kind: "feeling", ... })
    │
    ▼
Tender responds: "Good to hear. That one had been
                  lingering — any insight on what
                  finally got you to do it?"
```

### Gentle Inquiry Flow

```
Task has been deferred 3+ times
    │
    ▼
Tender (proactively): "I notice [task] keeps getting pushed.
                       No judgment — but I'm curious:
                       is it too big? Unpleasant?
                       Or maybe just not the right time?"
    │
    ▼
User: "I don't have Sarah's address"
    │
    ▼
Tender calls recordSignal(taskId, { kind: "inquiry", ... })
    │
    ▼
Tender responds: "Ah, a blocker! Would it help to
                  add 'get Sarah's address' as a
                  separate task?"
```

---

## Future Considerations

### Streaming

For longer responses, we'll want streaming:

```typescript
import { streamText } from "ai";

export async function streamChat(messages: Message[]) {
  const result = await streamText({
    model: defaultModel,
    system: systemPrompt,
    messages,
    tools,
    maxSteps: 5,
  });

  return result.toTextStreamResponse();
}
```

### Conversation History

The agent needs conversation context. Options:

1. **In-memory** — Simple, lost on restart
2. **Persisted** — New `conversations` table, enables continuity
3. **Sliding window** — Keep last N messages, summarize older ones

Start with in-memory, add persistence when continuity matters.

### Structured Output

For certain responses (task suggestions, pattern reports), we may want structured output:

```typescript
import { generateObject } from "ai";
import { z } from "zod";

const suggestionSchema = z.object({
  task: z.object({
    id: z.string(),
    description: z.string(),
  }),
  reason: z.string(),
  emotionalNote: z.string().optional(),
});

const result = await generateObject({
  model: defaultModel,
  schema: suggestionSchema,
  prompt: "Suggest the next task for the user",
});
```

### Graceful Degradation

If no LLM is configured or available:

- Task prioritization falls back to simple rules (due date, age, etc.)
- Emotional check-ins become optional prompts without AI responses
- Core functionality (CRUD, tracking) works fully

This maintains the local-first philosophy — Tender is useful even offline.

---

## Research Sources

- [Vercel AI SDK Documentation](https://ai-sdk.dev/docs/introduction)
- [AI SDK Provider Registry](https://ai-sdk.dev/docs/reference/ai-sdk-core/provider-registry)
- [Agentic AI Architecture Patterns](https://www.exabeam.com/explainers/agentic-ai/agentic-ai-architecture-types-components-best-practices/)
- [5 Key Trends Shaping Agentic Development in 2026](https://thenewstack.io/5-key-trends-shaping-agentic-development-in-2026/)
- [Conversational AI Design Patterns](https://www.patternfly.org/patternfly-ai/conversation-design/)
