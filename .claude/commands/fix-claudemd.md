# Fix CLAUDE.md Files

Fix CLAUDE.md files that are over the 600 token limit.

## Arguments

- `$ARGUMENTS` - Optional file path or "all" to scan all CLAUDE.md files

## Instructions

### If no arguments or specific file path:

1. If a file path is provided, use it. Otherwise, ask which CLAUDE.md file to fix.

2. Run the linter to check current state:

```bash
echo '{"tool_name":"Edit","tool_input":{"file_path":"<FILE_PATH>"}}' | node .claude/hooks/claudemd-linter.js 2>&1 | grep -v "MODULE_TYPELESS" | grep -v "Reparsing"
```

3. If the file is over 600 tokens and has code blocks, run the fixer with dry-run:

```bash
node .claude/hooks/claudemd-fixer.js "<FILE_PATH>" --dry-run
```

4. Show the user what will change and confirm they want to proceed.

5. If confirmed, run without dry-run:

```bash
node .claude/hooks/claudemd-fixer.js "<FILE_PATH>"
```

6. Re-run the linter to verify the fix worked.

### If "all" argument:

1. Find all CLAUDE.md files over 600 tokens:

```bash
for f in $(find . -name "CLAUDE.md" -not -path "./node_modules/*" 2>/dev/null); do
  size=$(wc -c < "$f")
  tokens=$((size / 4))
  if [ $tokens -gt 600 ]; then
    echo "$f (~$tokens tokens)"
  fi
done
```

2. Show the list to the user.

3. For each file:
   - Run the fixer with --dry-run
   - Show what will change
   - Ask for confirmation before applying

4. Report summary of all fixes.

## What the Fixer Does

The `claudemd-fixer.js` script:

1. Extracts code blocks to `docs/guides/reference/<name>-patterns.md`
2. Keeps all MUST/SHOULD/MAY rules in the CLAUDE.md
3. Adds a pointer to the new reference document
4. Preserves section structure

Files that are still over 600 tokens after code extraction need manual fixes:

- Move "Why" explanations to docs/
- Remove verbose descriptions
- Keep only actionable rules
