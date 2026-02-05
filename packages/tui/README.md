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
