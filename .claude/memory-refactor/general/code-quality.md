# Code Quality Standards

## File Operations

- ALWAYS read files before editing—Edit tool requires prior Read
- When editing multiple sections of the same file, read once then batch edits

## Code Standards

- NEVER use `any` type—look up actual types
- ALWAYS throw errors early and often—no fallbacks
- Delegate complex tasks to subagents
- Don't create documentation unless explicitly requested

## Package Management

- ALWAYS use `bun` instead of `npm` (better performance in WSL2)
- Use `bun install`, `bun run`, `bun add`, etc.
