# CLAUDE Rules: API Contracts Package

## Scope

Applies when creating or modifying: `packages/contracts/src/schemas/`, `packages/contracts/src/contracts/`

## Non-Negotiables (MUST / MUST NOT)

**Valibot Schemas**:

- MUST use Valibot v1.2.0+ `pipe()` API (NOT array-based pipelines)
- MUST provide custom error messages for user-facing validation
- MUST use `v.picklist()` for enums (NOT string literals)
- MUST transform query params to correct types (string → number)
- MUST make ALL fields optional in update schemas

**Type Inference**:

- MUST export types using `v.InferOutput<typeof Schema>`
- MUST use `v.InferInput` for types before transformations
- MUST use `v.InferOutput` for types after transformations

**ts-rest Contracts**:

- MUST include all relevant status codes in `responses` (200, 201, 400, 401, 404, 409, 500)
- MUST provide `summary` and `description` for OpenAPI documentation
- MUST use Valibot schemas for pathParams, query, body validation
- MUST define specific paths BEFORE parameterized paths (e.g., `/stats` before `/:id`)
- MUST add `body: c.type<undefined>()` for GET/DELETE endpoints with no body
- MUST use descriptive schema names: `CreateXSchema`, `UpdateXSchema`, `XResponseSchema`
- MUST NOT validate business logic in schemas (e.g., "badge must be unassigned")

## Defaults (SHOULD)

- SHOULD group related schemas in same file
- SHOULD use `v.pipe()` for complex validation chains

## Workflow

**When adding new API endpoint**:

1. Create Valibot schema in `src/schemas/[resource].schema.ts`
2. Export type using `v.InferOutput<>`
3. Create ts-rest contract in `src/contracts/[resource].contract.ts`
4. Export from `src/index.ts`
5. Implement backend route using contract

**When adding validation**:

1. Use `v.pipe()` for multi-step validation
2. Provide custom error messages
3. Transform query params to correct types
