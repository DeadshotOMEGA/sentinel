# CLAUDE Rules: Reference Documentation

## Scope

Applies when creating documentation in: `docs/guides/reference/`

## Non-Negotiables (MUST / MUST NOT)

**Content Type**:

- MUST be information-oriented specifications
- MUST provide complete, precise details (NOT narrative or teaching)
- MUST use tables, lists, and structured formats
- MUST use kebab-case filenames

**Structure**:

- MUST be organized by logical structure (NOT narrative flow)
- MUST document every option, parameter, field
- MUST include types, defaults, valid values
- MUST NOT include explanations or tutorials (link to them instead)

**For API Reference**:

- MUST include: HTTP method, path, request format, response format, status codes, errors
- MUST provide example curl commands
- MUST document all error codes

## Defaults (SHOULD)

**Auto-Generation**:

- SHOULD prefer auto-generated reference when possible (OpenAPI, TypeDoc)
- SHOULD generate from ts-rest contracts or TypeScript types
- SHOULD keep in sync with code

**Organization**:

- SHOULD use subject-reference pattern: `api-endpoints.md`, `environment-variables.md`
- SHOULD group related items logically

## Workflow

**When to create reference**:

1. API exists without formal specification
2. Configuration options need documentation
3. Multiple parameters/options exist
4. Users need to look up details
5. Specification is stable

**When NOT to create reference**:

- Teaching how to use → Use tutorial
- Solving tasks → Use how-to
- Explaining concepts → Use explanation

**Auto-generation strategy**:

- OpenAPI/Swagger from ts-rest contracts
- Type docs from TypeScript with TSDoc
- Database schema from Prisma schema

## Quick Reference

**Template**: `@docs/templates/reference.md`

**Characteristics**:

- Information-oriented (facts and specs)
- Complete (every option documented)
- Organized by structure (logical grouping)
- Precise (exact parameters, types)
- No narrative (tables, lists only)
