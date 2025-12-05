Run HeroUI compliance check on component files.

**Usage:** `/heroui-check [file_path]`

If no file path provided, checks all recently modified .tsx/.jsx files in the current working directory.

**What it does:**

Invokes the `heroui-guardian` agent to perform comprehensive HeroUI compliance analysis:

1. **Scan for native HTML elements** that should use HeroUI components
   - Detects: `<button>`, `<input>`, `<select>`, `<textarea>`, `<a href=>`
   - Excludes allowed exceptions: `<input type="file">`, `<canvas>`, `<video>`, `<audio>`

2. **Validate component props and event handlers**
   - Checks for `onClick` (should be `onPress`)
   - Checks for `checked` (should be `isSelected`)
   - Checks for `disabled` (should be `isDisabled`)
   - Verifies controlled component patterns

3. **Check design consistency with theme tokens**
   - Blocks hardcoded hex colors: `bg-[#007fff]`
   - Enforces semantic colors: `color="primary"`, `bg-primary`
   - Validates theme variable usage

4. **Validate imports**
   - Ensures all HeroUI imports use `@heroui/react`
   - Flags incorrect package imports

5. **Accessibility audit**
   - Finds icon-only buttons missing `aria-label`
   - Checks form input labels
   - Verifies kiosk touch targets (56px minimum)

6. **Run CLI diagnostics**
   - Executes `bunx heroui doctor`
   - Reports dependency issues
   - Shows environment info

7. **Generate detailed compliance report**
   - Lists all violations by severity (ERRORS, WARNINGS, SUGGESTIONS)
   - Provides line numbers and code snippets
   - Includes actionable fixes with before/after examples

**Examples:**

```bash
# Check specific file
/heroui-check src/components/LoginForm.tsx

# Check current directory for recent changes
/heroui-check

# Check entire app directory
/heroui-check kiosk/src
```

**Report includes:**
- ❌ ERRORS: Must fix before merge (native HTML, wrong props, hardcoded colors)
- ⚠️ WARNINGS: Recommended fixes (accessibility, touch targets)
- 💡 SUGGESTIONS: Best practices (import optimization, patterns)

**Exit behavior:**
- Returns detailed markdown report
- Shows CLI diagnostic output
- Provides auto-fix code snippets
