---
type: reference
title: "[Component/API/Module] Reference"
status: draft
created: YYYY-MM-DD
last_updated: YYYY-MM-DD
ai:
  priority: high
  context_load: on-demand
  triggers:
    - [add relevant keywords]
    - reference
    - api
    - spec
  token_budget: 1200
version: "[API/component version]"
stability: [stable | beta | alpha | deprecated]
api_version: "[if applicable]"
related_refs:
  - [Related reference docs]
---

# [Component/API/Module] Reference

**Version:** [X.Y.Z]

**Stability:** [Stable | Beta | Alpha | Deprecated]

**Quick Links:**
- [Jump to API](#api-reference)
- [Jump to Configuration](#configuration)
- [Jump to Types](#type-reference)
- [Jump to Examples](#examples)

---

## Overview

**What:** [Brief description of what this documents]

**Purpose:** [Why this component/API exists]

**Use cases:**
- [Primary use case 1]
- [Primary use case 2]

---

## Installation / Import

```[language]
// Installation (if applicable)
npm install package-name

// Import
import { Component } from 'package-name'
// or
const { Component } = require('package-name')
```

**Version compatibility:**
- Node.js: [version requirements]
- [Other dependencies]

---

## Quick Start

**Minimal working example:**

```[language]
// Simplest possible usage
const result = await api.doSomething()
```

**For complete usage, see [How-to Guide](../guides/howto/using-component.md)**

---

## API Reference

### [Method/Function 1]

**Signature:**
```[language]
functionName(param1: Type1, param2: Type2): ReturnType
```

**Description:** [What this function does]

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `param1` | `Type1` | Yes | - | [What this parameter is] |
| `param2` | `Type2` | No | `null` | [What this parameter is] |
| `options` | `Options` | No | `{}` | [Configuration object] |

**Returns:** `ReturnType` - [What the function returns]

**Throws:**
- `ErrorType1` - [When this error is thrown]
- `ErrorType2` - [When this error is thrown]

**Examples:**

**Basic usage:**
```[language]
const result = functionName('value1', 'value2')
```

**With options:**
```[language]
const result = functionName('value1', 'value2', {
  option1: true,
  option2: 'custom'
})
```

**Error handling:**
```[language]
try {
  const result = functionName('value1', 'value2')
} catch (error) {
  if (error instanceof ErrorType1) {
    // Handle specific error
  }
}
```

---

### [Method/Function 2]

[Repeat pattern for all methods/functions]

---

## Configuration

### Configuration Options

**Complete configuration object:**

```[language]
{
  option1: 'value',           // [Description]
  option2: 42,                // [Description]
  nested: {
    subOption1: true,         // [Description]
    subOption2: ['a', 'b']    // [Description]
  }
}
```

### Option Reference

#### `option1`

**Type:** `string`

**Default:** `'default-value'`

**Description:** [Detailed description of what this option does]

**Valid values:**
- `'value1'` - [What this means]
- `'value2'` - [What this means]

**Example:**
```[language]
{ option1: 'value1' }
```

---

#### `option2`

[Repeat pattern for all options]

---

## Type Reference

### `TypeName`

**Definition:**
```[language]
interface TypeName {
  property1: string
  property2: number
  optional?: boolean
}
```

**Properties:**

#### `property1`

**Type:** `string`

**Required:** Yes

**Description:** [What this property represents]

**Constraints:**
- [Validation rule 1]
- [Validation rule 2]

**Example:** `"valid-value"`

---

#### `property2`

[Repeat for all properties]

---

### `AnotherType`

[Repeat pattern for all types]

---

## Events

### `event-name`

**Emitted when:** [Trigger condition]

**Payload:**
```[language]
{
  data: string,
  timestamp: Date
}
```

**Properties:**
- `data` - [Description]
- `timestamp` - [Description]

**Example:**
```[language]
emitter.on('event-name', (payload) => {
  console.log(payload.data)
})
```

---

### [Another event]

[Repeat pattern]

---

## Error Reference

### `ErrorType1`

**Thrown by:** [`functionName`](#method-function-1)

**Reason:** [When this error occurs]

**Properties:**
- `message` - Error message
- `code` - Error code (e.g., `ERR_INVALID_INPUT`)
- `details` - Additional error context

**Handling:**
```[language]
try {
  // operation
} catch (error) {
  if (error instanceof ErrorType1) {
    console.error(`Error: ${error.message}`)
    // Recovery logic
  }
}
```

---

### [Another error]

[Repeat pattern]

---

## Constants

### `CONSTANT_NAME`

**Type:** `string`

**Value:** `'CONSTANT_VALUE'`

**Description:** [What this constant represents]

**Usage:**
```[language]
if (status === CONSTANT_NAME) {
  // Handle this status
}
```

---

## Examples

### Example 1: [Common use case]

**Scenario:** [Describe what this example demonstrates]

```[language]
// Complete working example
// with explanatory comments
```

**Output:**
```
[Expected output]
```

---

### Example 2: [Advanced use case]

[Repeat pattern]

---

## Integration Patterns

### Pattern 1: [Integration approach]

**When to use:** [Scenario]

**Implementation:**
```[language]
// Pattern code
```

**See also:** [Related how-to guide]

---

## Performance Considerations

**Time complexity:** O(n) for [operation]

**Space complexity:** O(1) for [operation]

**Benchmarks:**
- [Operation 1]: ~Xms per call
- [Operation 2]: ~Yms per call

**Optimization tips:**
- [Tip 1]
- [Tip 2]

---

## Compatibility

**Supported platforms:**
- Node.js [version range]
- [Browser support if applicable]

**Breaking changes:**
- Version X.Y: [What changed]
- Version X.Z: [What changed]

**Migration guides:**
- [Migrating from vX to vY](../guides/howto/migration-guide.md)

---

## Deprecation Notices

### Deprecated: `oldFunction()`

**Since:** v2.0.0

**Removal:** v3.0.0

**Reason:** [Why it was deprecated]

**Migration:**
```[language]
// Old way
oldFunction(params)

// New way
newFunction(params)
```

---

## Related Documentation

**Reference:**
- [Related API reference]
- [Related type reference]

**How-to Guides:**
- [How to use this component](../guides/howto/use-component.md)

**Explanation:**
- [Conceptual background](../guides/explanation/concept.md)

**Tutorials:**
- [Learning guide](../guides/tutorials/learning-component.md)

---

## External Resources

- [Official docs]
- [GitHub repository]
- [npm package]
- [API playground/REPL]

---

**Last Updated:** YYYY-MM-DD
