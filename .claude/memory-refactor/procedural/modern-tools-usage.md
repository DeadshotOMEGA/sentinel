# Modern Tools Usage Guide

When Bash commands are appropriate (after considering specialized tools like Read/Grep/Glob), prefer modern alternatives with better performance and usability.

## Core Principle

**Always prefer specialized tools first:**

- Read tool > `cat`/`bat`/`head`/`tail`
- Grep tool > `rg`/`grep` (Grep tool uses rg internally)
- Glob tool > `fd`/`find`

**Only use bash commands when:**

- Specialized tools can't handle the task
- Building complex pipelines
- Scripting multi-step operations

---

## Tool Reference

### fd (file finding)

**Use when:** Finding files by pattern in bash pipelines or scripts

**Prefer over:** `find` command

**Common patterns:**

```bash
# Find TypeScript files
fd -e ts -e tsx

# Find files excluding node_modules
fd --type f --exclude node_modules '\.config\.js$'

# Find and execute
fd -e md -x wc -l {}

# Hidden files too
fd -H -I pattern
```

**When NOT to use:** Simple file searches → use Glob tool instead

---

### sg / ast-grep (structural code search)

**Use when:**

- Refactoring code patterns across multiple files
- Finding complex code structures (not just text)
- Language-aware search (respects syntax)

**Examples:**

```bash
# Find all useState hooks
sg -p 'useState($$$)'

# Find function calls with specific pattern
sg -p 'foo($A, $B)' --lang typescript

# Replace patterns
sg -p 'console.log($$$)' -r '' --lang typescript
```

**When to use:**

- Large-scale refactoring tasks
- Finding code patterns that regex can't express
- Type-aware searches

**When NOT to use:** Simple text searches → use Grep tool

---

### jq (JSON processing)

**Use when:**

- Parsing JSON in bash pipelines
- Extracting fields from JSON responses
- Transforming JSON data

**Common patterns:**

```bash
# Extract field
curl api.example.com | jq '.data.users'

# Filter arrays
jq '[.[] | select(.active == true)]' data.json

# Transform structure
jq '{name: .userName, id: .userId}' data.json

# Raw output (no quotes)
jq -r '.results[].name' data.json
```

**Already permitted** - use freely in bash commands

---

### xq (XML/HTML processing)

**Use when:**

- Parsing XML/HTML in bash pipelines
- Extracting data from structured XML
- XML transformation tasks

**Common patterns:**

```bash
# Query XML with XPath
xq '.root.items.item[]' data.xml

# Convert XML to JSON
xq . data.xml

# Extract attributes
xq '.config."@version"' settings.xml
```

**Already permitted** - use freely in bash commands

---

### pq (Parquet query)

**Use when:**

- Analyzing parquet data files
- Querying columnar data
- Data science/analytics tasks

**Common patterns:**

```bash
# Schema inspection
pq schema data.parquet

# Query parquet file
pq 'SELECT * FROM data.parquet WHERE value > 100'

# Convert to JSON
pq --json data.parquet
```

**Specialized use case** - only for parquet data files

---

## Decision Tree

```
Need to process data?
├─ JSON? → Use jq in bash pipeline
├─ XML/HTML? → Use xq in bash pipeline
├─ Parquet? → Use pq
└─ Code structure? → Use sg (ast-grep)

Need to find files?
├─ Simple pattern? → Use Glob tool (preferred)
└─ Complex bash pipeline? → Use fd

Need to search code?
├─ Text/regex pattern? → Use Grep tool (preferred)
└─ Structural pattern? → Use sg (ast-grep)
```

---

## Auto-Rewrites (via hook)

These commands are automatically rewritten by `pretooluse-modern-tools.py`:

- ✅ `time cmd` → `hyperfine --runs 10 --warmup 3 'cmd'`
- ✅ `du -sh path` → `dust -r -d 2 path`

---

## Examples

### Good: Use jq for JSON in pipelines

```bash
gh api repos/user/project/issues | jq '.[] | {number, title, state}'
```

### Good: Use sg for structural refactoring

```bash
# Find all React components using old lifecycle methods
sg -p 'componentWillMount($$$)' --lang typescript
```

### Good: Use fd in complex bash operations

```bash
# Find and process files in one pipeline
fd -e json -x jq '.version' {} \; | sort -u
```

### Bad: Using bash find when Glob tool works

```bash
# ❌ Don't do this
Bash("find . -name '*.ts'")

# ✅ Do this instead
Glob(pattern="**/*.ts")
```

### Bad: Using bash grep when Grep tool works

```bash
# ❌ Don't do this
Bash("rg 'pattern' .")

# ✅ Do this instead
Grep(pattern="pattern", output_mode="files_with_matches")
```
