# @tender/tui

Terminal UI for Tender - a degraded-first task management interface built with [Ink](https://github.com/vadimdemedes/ink) (React for CLI).

## Colors

When choosing colors for terminal output, we follow the guidance from Luna Razzaghipour's [Terminal Colors](https://blog.xoria.org/terminal-colors/) blog post.

**The problem**: Colors that look good in one terminal theme become illegible in others. Testing across popular themes (Basic, Tango, Solarized, etc.) reveals that only 11 of 32 possible color settings remain readable across common configurations.

**Key takeaways**:

- Avoid relying on bright/bold color variants, especially `bryellow` which is unreadable in many light themes
- Solarized's use of the 16-color palette for accent colors creates compatibility issues for applications using standard bright colors
- Prioritize readability across themes over aesthetic preference

When adding colors to this TUI, prefer the "safe" subset of colors that work across terminal themes rather than assuming users share your terminal configuration.

### Semantic color tokens

Rather than hardcoding terminal colors directly, use the semantic tokens from `src/theme.ts`. This decouples intent from implementation, similar to CSS custom properties:

| Token         | Color  | Usage                                        |
| ------------- | ------ | -------------------------------------------- |
| `interactive` | cyan   | Key hints, tags, prompts, headings           |
| `success`     | green  | Active state, confirmation messages          |
| `warning`     | yellow | Time-sensitive actions (e.g. undo countdown) |
| `danger`      | red    | Errors, critical status                      |

Use `dimColor` (Ink's built-in) for de-emphasized text like the status bar key hints.

When adding a new color usage, check whether an existing semantic token fits before adding a new one.
