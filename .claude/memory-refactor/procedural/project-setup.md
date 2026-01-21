# Project Setup Checklist

When this repo is used as a starter for a new project, complete these steps.

## 1. Execute Permissions

Git preserves the executable bit, but verify after cloning:

```bash
# Check for scripts missing execute permission
find .claude -name "*.py" -o -name "*.sh" | xargs ls -la | grep -v "^-rwx"

# Fix all scripts
find .claude -name "*.py" -exec chmod +x {} \;
find .claude -name "*.sh" -exec chmod +x {} \;
```

**Symptoms of missing permissions:**
- `Permission denied` when hooks run
- Scripts work with `python3 script.py` but not `./script.py`

## 2. Line Endings

See `line-endings.md` for details. Quick check:

```bash
# Find CRLF issues
find .claude -name "*.py" -exec file {} \; | grep CRLF

# Fix if found
find .claude -name "*.py" -exec sed -i 's/\r$//' {} \;
```

## 3. Dependencies

```bash
# Node/Bun packages (root)
bun install

# Python packages (if requirements.txt exists)
pip install -r requirements.txt
```

## 4. pdocs CLI (Optional)

If using the documentation management CLI:

```bash
cd .claude/pdocs
bun install
bun run build

# Verify
./pdocs info
```

See `.claude/pdocs/README.md` for full documentation.

## 5. Python Command (WSL2/Linux)

Modern Ubuntu/Debian only provides `python3`, not `python`. Set up the alias:

```bash
# Recommended: use update-alternatives
sudo update-alternatives --install /usr/bin/python python /usr/bin/python3 1

# Verify
python --version  # Should show Python 3.x.x
```

**Why this matters:**
- Some tools/scripts expect `python` command
- Makefiles may use `python` instead of `python3`
- Consistent cross-platform behavior

**Alternative (symlink):**
```bash
sudo ln -s /usr/bin/python3 /usr/bin/python
```

## 6. Git Authentication

```bash
# Configure git to use GitHub CLI for auth
gh auth setup-git
```

## 7. Environment Variables

```bash
# Create local environment file if template exists
cp .env.example .env.local  # Edit with your values
```

## 8. Verify Hooks Work

```bash
# Test a hook manually
echo '{}' | python3 .claude/statusline/hooks/agent-tracker.py
echo "Exit code: $?"  # Should be 0
```

## Platform-Specific Notes

| Platform | Watch For |
|----------|-----------|
| **WSL2** | Line endings (CRLF), `python` command missing, file permissions |
| **Windows** | Shebangs don't work natively; use `python script.py` instead of `./script.py` |
| **macOS** | `sed -i` requires `sed -i ''` (empty string argument) |
| **Linux** | `python` command may be missing (use `update-alternatives`) |

## Quick Validation Script

Run after cloning to verify setup:

```bash
#!/bin/bash
echo "Checking project setup..."

# Check line endings
crlf_count=$(find .claude -name "*.py" -exec file {} \; 2>/dev/null | grep -c CRLF || echo 0)
if [ "$crlf_count" -gt 0 ]; then
  echo "⚠️  Found $crlf_count files with CRLF line endings"
else
  echo "✅ Line endings OK"
fi

# Check execute permissions on hooks
hooks_without_exec=$(find .claude -path "*/hooks/*.py" ! -perm -u+x 2>/dev/null | wc -l)
if [ "$hooks_without_exec" -gt 0 ]; then
  echo "⚠️  Found $hooks_without_exec hook scripts without execute permission"
else
  echo "✅ Hook permissions OK"
fi

# Check node_modules
if [ -d "node_modules" ] || [ -d ".claude/pdocs/node_modules" ]; then
  echo "✅ Node modules installed"
else
  echo "⚠️  Run 'bun install' to install dependencies"
fi

# Check python command
if command -v python &> /dev/null; then
  echo "✅ python command available ($(python --version 2>&1))"
else
  echo "⚠️  'python' command not found - run: sudo update-alternatives --install /usr/bin/python python /usr/bin/python3 1"
fi

# Check pdocs
if [ -f ".claude/pdocs/dist/index.js" ]; then
  echo "✅ pdocs built"
else
  echo "⚠️  pdocs not built - run: cd .claude/pdocs && bun install && bun run build"
fi

echo "Setup check complete."
```
