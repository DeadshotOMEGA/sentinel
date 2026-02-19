# Contracts Package Instructions

Scope: `packages/contracts/src/schemas/**`, `packages/contracts/src/contracts/**`

## Inheritance

- Apply root `AGENTS.md` and root `CLAUDE.md`.

## Non-negotiable schema rules

- Use Valibot `pipe()` API (not array-based pipeline form).
- Use custom user-facing validation messages.
- Use `v.picklist()` for enums.
- Transform query params to target types.
- Update schemas must make all fields optional.
- Export inferred types with `v.InferOutput<typeof Schema>`.
- Use `v.InferInput` when input-before-transform typing is needed.

## Non-negotiable contract rules

- Include relevant statuses in ts-rest `responses`:
  200, 201, 400, 401, 404, 409, 500.
- Add `summary` and `description` for OpenAPI output quality.
- Use Valibot schemas for params/query/body.
- Place specific paths before parameterized paths.
- For GET/DELETE with no body, use `body: c.type<undefined>()`.
- Use descriptive schema names (`CreateXSchema`, `UpdateXSchema`, `XResponseSchema`).
- Keep business rules out of validation schemas.

## Workflow

- Add schema -> export types -> add contract -> export from `src/index.ts`.

## Reference

- Source file: `packages/contracts/CLAUDE.md`.
