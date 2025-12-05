# Enhanced Reports - Dependencies & Installation

This document lists all new dependencies required for the Enhanced Reports feature.

---

## Frontend Dependencies

### Production Dependencies

```bash
cd /home/sauk/projects/sentinel/frontend
bun add @react-pdf/renderer @react-pdf/types file-saver
```

| Package | Version | Purpose |
|---------|---------|---------|
| `@react-pdf/renderer` | ^3.1.14 | React-based PDF generation library |
| `@react-pdf/types` | ^2.3.7 | TypeScript type definitions for react-pdf |
| `file-saver` | ^2.0.5 | Trigger file downloads in browser |

### Development Dependencies

```bash
cd /home/sauk/projects/sentinel/frontend
bun add -d @types/file-saver
```

| Package | Version | Purpose |
|---------|---------|---------|
| `@types/file-saver` | ^2.0.5 | TypeScript types for file-saver |

### Existing Dependencies (No Changes)
- `@heroui/react` - UI components (already installed)
- `@tanstack/react-query` - Data fetching (already installed)
- `react`, `react-dom` - Core React (already installed)
- `date-fns` - Date manipulation (already installed)

---

## Backend Dependencies

### Production Dependencies

```bash
cd /home/sauk/projects/sentinel/backend
bun add date-fns
```

| Package | Version | Purpose |
|---------|---------|---------|
| `date-fns` | ^3.0.0 | Date calculations for training nights, trends |

**Note**: All other required backend dependencies already exist:
- `zod` - Schema validation
- `express` - API routing
- `pg` / `@prisma/client` - Database access
- `uuid` - ID generation
- `winston` - Logging

---

## System Dependencies

### Image Assets

Ensure the unit crest image is accessible:

**Source Location**: `/home/sauk/projects/images/hmcs_chippawa_crest.jpg`

**Frontend Public Directory**: Copy to `/home/sauk/projects/sentinel/frontend/public/images/`

```bash
mkdir -p /home/sauk/projects/sentinel/frontend/public/images
cp /home/sauk/projects/images/hmcs_chippawa_crest.jpg /home/sauk/projects/sentinel/frontend/public/images/
```

This allows the PDF component to reference the image as `/images/hmcs_chippawa_crest.jpg`.

---

## Database Extensions

No new PostgreSQL extensions required. The project already uses:
- `pgcrypto` - UUID generation (already enabled in schema.sql)

---

## Runtime Requirements

| Requirement | Version | Notes |
|-------------|---------|-------|
| Bun | >= 1.0.0 | Package manager and runtime |
| PostgreSQL | >= 14 | Database |
| Redis | >= 6.0 | Session storage |
| Node.js | >= 18 | For Playwright E2E tests |

---

## Installation Script

Run this script to install all dependencies in one go:

```bash
#!/bin/bash
set -e

# Frontend dependencies
echo "Installing frontend dependencies..."
cd /home/sauk/projects/sentinel/frontend
bun add @react-pdf/renderer @react-pdf/types file-saver
bun add -d @types/file-saver

# Backend dependencies
echo "Installing backend dependencies..."
cd /home/sauk/projects/sentinel/backend
bun add date-fns

# Copy unit crest image
echo "Copying unit crest image..."
mkdir -p /home/sauk/projects/sentinel/frontend/public/images
cp /home/sauk/projects/images/hmcs_chippawa_crest.jpg /home/sauk/projects/sentinel/frontend/public/images/

echo "All dependencies installed successfully!"
```

Save as `/home/sauk/projects/sentinel/scripts/install-reports-deps.sh` and run:

```bash
chmod +x /home/sauk/projects/sentinel/scripts/install-reports-deps.sh
/home/sauk/projects/sentinel/scripts/install-reports-deps.sh
```

---

## Verification

After installation, verify dependencies:

### Frontend
```bash
cd /home/sauk/projects/sentinel/frontend
bun run tsc --noEmit  # Should compile without errors
```

### Backend
```bash
cd /home/sauk/projects/sentinel/backend
bun run tsc --noEmit  # Should compile without errors
```

### Check Package Versions
```bash
cd /home/sauk/projects/sentinel/frontend
cat package.json | grep -A 10 '"dependencies"'

cd /home/sauk/projects/sentinel/backend
cat package.json | grep -A 10 '"dependencies"'
```

---

## Potential Issues

### Issue: `@react-pdf/renderer` Font Loading Errors

**Symptom**: PDF generation fails with "Font not found" error

**Solution**: Register custom fonts or use built-in fonts only:

```typescript
// In PDFLetterhead.tsx
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica'  // Built-in font, always available
  }
});
```

For custom fonts (Inter, as specified in requirements), add font registration:

```typescript
import { Font } from '@react-pdf/renderer';

Font.register({
  family: 'Inter',
  src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2'
});
```

### Issue: PDF Generation Slow for Large Reports

**Symptom**: Browser hangs when generating reports with >500 members

**Solution**: Implement pagination or streaming:

```typescript
// Split large datasets into multiple pages
const ROWS_PER_PAGE = 50;
const pages = Math.ceil(data.members.length / ROWS_PER_PAGE);

for (let page = 0; page < pages; page++) {
  const pageMembers = data.members.slice(
    page * ROWS_PER_PAGE,
    (page + 1) * ROWS_PER_PAGE
  );
  // Render page
}
```

### Issue: Image Not Loading in PDF

**Symptom**: PDF renders but crest image is missing

**Solution**: Verify image path and format:

1. Check image exists: `ls -la /home/sauk/projects/sentinel/frontend/public/images/hmcs_chippawa_crest.jpg`
2. Verify image format (JPEG/PNG supported)
3. Use absolute path in Image component: `src="/images/hmcs_chippawa_crest.jpg"`
4. If still failing, convert to base64 data URI

---

## Package Lock Files

After installation, commit updated lock files:

```bash
git add frontend/bun.lockb backend/bun.lockb
git commit -m "feat: add dependencies for enhanced reports feature"
```

---

## Uninstallation (If Needed)

To remove all dependencies added for this feature:

```bash
# Frontend
cd /home/sauk/projects/sentinel/frontend
bun remove @react-pdf/renderer @react-pdf/types file-saver @types/file-saver

# Backend
cd /home/sauk/projects/sentinel/backend
bun remove date-fns

# Remove image
rm /home/sauk/projects/sentinel/frontend/public/images/hmcs_chippawa_crest.jpg
```

---

**Last Updated**: 2024-12-04
