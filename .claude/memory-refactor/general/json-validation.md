# JSON Validation

## Rule

Validate JSON structure before parsing. Handle malformed JSON gracefully.

## When This Applies

- Parsing API responses
- Reading JSON config files
- Processing user-provided JSON input

## Pattern to Avoid

```python
# Bad: No error handling
data = json.loads(response)
```

## Best Practice

```python
# Good: Wrap in try/except
try:
    data = json.loads(response)
except json.JSONDecodeError as e:
    # Handle gracefully or report clear error
    raise ValueError(f"Invalid JSON at line {e.lineno}: {e.msg}")
```

## Common Causes

1. **Trailing commas** — JSON doesn't allow trailing commas in arrays/objects
2. **Single quotes** — JSON requires double quotes for strings
3. **Unquoted keys** — All object keys must be quoted
4. **Comments** — Standard JSON doesn't support comments
5. **Truncated responses** — Network issues causing incomplete data
