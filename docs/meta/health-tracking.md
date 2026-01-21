---
type: meta
title: "Documentation Health Tracking"
status: published
created: 2026-01-19
last_updated: 2026-01-19
ai:
  priority: medium
  context_load: on-demand
  triggers:
    - health
    - staleness
    - monitoring
    - coverage
    - broken-links
  token_budget: 1600
---

# Documentation Health Tracking

**Purpose:** Monitor and maintain documentation quality over time

**Audience:** Documentation maintainers, DevOps engineers

**Key Insight:** Documentation decays. Tracking prevents rot.

---

## Layer 1: Core Concepts (Essential)

### What is Documentation Health?

**Healthy documentation:**
- Accurate (reflects current code)
- Complete (covers all features)
- Accessible (no broken links)
- Fresh (recently reviewed)

**Unhealthy documentation:**
- Stale (outdated information)
- Incomplete (missing coverage)
- Broken (dead links, wrong paths)
- Orphaned (no links to/from)

---

### The Four Health Metrics

#### 1. Staleness

**Definition:** Time since last meaningful update

**Thresholds:**
- ✅ Fresh: < 30 days
- ⚠️ Aging: 30-90 days
- ❌ Stale: > 90 days

**Calculation:**
```
staleness_days = today - last_updated
```

---

#### 2. Coverage

**Definition:** Percentage of code with documentation

**Measurement:**
- Repositories documented / Total repositories
- Services documented / Total services
- Routes documented / Total routes

**Target:** 80%+ coverage

---

#### 3. Link Health

**Definition:** Percentage of working links

**Checks:**
- Internal links (relative paths)
- External links (HTTP/HTTPS)
- Code references (file paths)

**Target:** 100% working links

---

#### 4. Orphan Detection

**Definition:** Documents with no inbound links

**Criteria:**
- Not linked from any other doc
- Not in any index
- Not in README/CLAUDE.md navigation

**Action:** Link or archive

---

## Layer 2: Implementation (Detailed)

### Staleness Tracking

#### Automatic Staleness Detection

**Script:** `scripts/check-doc-staleness.sh`

```bash
#!/bin/bash

# Find all markdown files
find docs/ -name "*.md" | while read file; do
  # Extract last_updated from frontmatter
  updated=$(grep "last_updated:" "$file" | head -1 | awk '{print $2}')

  if [ -n "$updated" ]; then
    # Calculate days since update
    days_old=$(( ($(date +%s) - $(date -d "$updated" +%s)) / 86400 ))

    # Classify staleness
    if [ $days_old -gt 90 ]; then
      echo "❌ STALE ($days_old days): $file"
    elif [ $days_old -gt 30 ]; then
      echo "⚠️  AGING ($days_old days): $file"
    else
      echo "✅ FRESH ($days_old days): $file"
    fi
  else
    echo "⚠️  NO DATE: $file"
  fi
done
```

---

#### Staleness Report

**Output:**

```
Documentation Staleness Report
Generated: 2026-01-19

STALE (>90 days):
❌ docs/guides/explanation/old-auth-system.md (120 days)
❌ docs/research/2025-10-01-database-eval.md (110 days)

AGING (30-90 days):
⚠️  docs/guides/howto/setup-old-testing.md (45 days)
⚠️  docs/decisions/adr/0001-initial-architecture.md (60 days)

FRESH (<30 days):
✅ docs/CLAUDE.md (0 days)
✅ docs/plans/active/backend-rebuild-plan.md (4 days)

Summary:
- Total docs: 50
- Fresh: 35 (70%)
- Aging: 10 (20%)
- Stale: 5 (10%)
```

---

#### Staleness Triggers

**Automatic staleness when:**

1. **Code changes:**
   ```bash
   # If repository file changes
   git diff HEAD~1 apps/backend/src/repositories/member-repository.ts

   # Flag related docs as needing review
   docs/domains/personnel/reference-member-repository.md
   ```

2. **Dependency updates:**
   ```bash
   # If better-auth updated
   pnpm update better-auth

   # Flag auth docs for review
   docs/domains/authentication/*.md
   ```

3. **Time-based:**
   ```bash
   # Every 90 days, flag for review
   # Even if no code changes
   ```

---

### Coverage Tracking

#### Code-to-Doc Mapping

**Track what has documentation:**

```typescript
// scripts/check-coverage.ts

interface CodeEntity {
  type: 'repository' | 'service' | 'route'
  path: string
  documented: boolean
  docPath?: string
}

const repositories = [
  {
    type: 'repository',
    path: 'apps/backend/src/repositories/member-repository.ts',
    documented: true,
    docPath: 'docs/domains/personnel/reference-member-repository.md'
  },
  {
    type: 'repository',
    path: 'apps/backend/src/repositories/badge-repository.ts',
    documented: false // ❌ Missing docs
  }
]

// Calculate coverage
const documented = repositories.filter(r => r.documented).length
const total = repositories.length
const coverage = (documented / total) * 100

console.log(`Repository coverage: ${coverage}%`)
```

---

#### Coverage Report

```
Documentation Coverage Report
Generated: 2026-01-19

Repositories:
✅ member-repository.ts → docs/domains/personnel/reference-member-repository.md
✅ checkin-repository.ts → docs/domains/checkin/reference-checkin-repository.md
❌ division-repository.ts → NO DOCUMENTATION
✅ badge-repository.ts → docs/domains/personnel/reference-badge-repository.md
Coverage: 75% (3/4)

Services:
✅ member-service.ts → docs/domains/personnel/reference-member-service.md
❌ import-service.ts → NO DOCUMENTATION
❌ presence-service.ts → NO DOCUMENTATION
Coverage: 33% (1/3)

Routes:
✅ /api/members → docs/domains/personnel/reference-member-api.md
✅ /api/checkins → docs/domains/checkin/reference-checkin-api.md
❌ /api/divisions → NO DOCUMENTATION
✅ /api/badges → docs/domains/personnel/reference-badge-api.md
Coverage: 75% (3/4)

Overall Coverage: 61% (7/11)
Target: 80%
Gap: -19%
```

---

#### Coverage Enforcement

**CI/CD check:**

```yaml
# .github/workflows/docs-check.yml

name: Documentation Check

on: [push, pull_request]

jobs:
  coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Check coverage
        run: |
          pnpm run docs:coverage
          coverage=$(pnpm run docs:coverage --json | jq '.overall')
          if [ $coverage -lt 80 ]; then
            echo "❌ Documentation coverage $coverage% < 80%"
            exit 1
          fi
```

**Blocks merge if coverage drops**

---

### Link Health Monitoring

#### Link Checker Script

```bash
#!/bin/bash
# scripts/check-doc-links.sh

echo "Checking documentation links..."

broken_links=0

# Check all markdown files
find docs/ -name "*.md" | while read file; do
  echo "Checking $file..."

  # Extract links
  links=$(grep -oP '\[.*?\]\(\K[^)]+' "$file")

  for link in $links; do
    # Skip external links (check separately)
    if [[ $link == http* ]]; then
      continue
    fi

    # Skip anchors
    if [[ $link == \#* ]]; then
      continue
    fi

    # Resolve relative path
    dir=$(dirname "$file")
    full_path="$dir/$link"

    # Check if file exists
    if [ ! -f "$full_path" ]; then
      echo "  ❌ BROKEN: $link"
      ((broken_links++))
    fi
  done
done

echo ""
echo "Total broken links: $broken_links"

if [ $broken_links -gt 0 ]; then
  exit 1
fi
```

---

#### External Link Validation

```bash
#!/bin/bash
# scripts/check-external-links.sh

# Extract external links
grep -rh "http" docs/*.md | \
grep -oP 'https?://[^\)]+' | \
sort -u | \
while read url; do
  # Check HTTP status
  status=$(curl -s -o /dev/null -w "%{http_code}" "$url")

  if [ "$status" -eq 200 ]; then
    echo "✅ $url"
  else
    echo "❌ $status: $url"
  fi
done
```

---

#### Link Health Report

```
Link Health Report
Generated: 2026-01-19

Internal Links:
✅ docs/CLAUDE.md: 15 links, 0 broken
✅ docs/plans/active/backend-rebuild-plan.md: 23 links, 0 broken
❌ docs/guides/howto/old-setup.md: 8 links, 3 broken
  - Broken: ../reference/removed-api.md
  - Broken: ../../domains/old-domain/CLAUDE.md
  - Broken: ../../../apps/backend/src/deleted-file.ts

External Links:
✅ https://diataxis.fr/ (200)
✅ https://vitest.dev/ (200)
❌ https://old-docs-site.com/api (404)

Summary:
- Total internal links: 156
- Broken internal: 3 (98% health)
- Total external links: 24
- Broken external: 1 (96% health)
- Overall link health: 97%

Target: 100%
Gap: -3%
```

---

### Orphan Detection

#### Find Orphaned Documents

```bash
#!/bin/bash
# scripts/find-orphans.sh

# Get all docs
all_docs=$(find docs/ -name "*.md")

# For each doc, check if it's linked
for doc in $all_docs; do
  # Search for references to this doc
  refs=$(grep -r "$(basename "$doc")" docs/ --exclude="$doc" | wc -l)

  if [ $refs -eq 0 ]; then
    echo "❌ ORPHAN: $doc"
  fi
done
```

---

#### Orphan Report

```
Orphan Detection Report
Generated: 2026-01-19

Orphaned documents (no inbound links):

❌ docs/guides/explanation/old-approach.md
   Last updated: 2025-08-15 (157 days ago)
   Action: Archive or link from related docs

❌ docs/research/2025-09-01-spike-investigation.md
   Last updated: 2025-09-01 (140 days ago)
   Action: Link from ADR or archive

✅ docs/CLAUDE.md
   Root navigation file - expected to have no inbound links

Total orphans: 2 (excluding root/index files)
Recommendation: Archive or integrate into documentation structure
```

---

## Layer 3: Automation & CI/CD

### GitHub Actions Workflow

**Complete workflow:**

```yaml
# .github/workflows/docs-health.yml

name: Documentation Health

on:
  schedule:
    - cron: '0 0 * * 0' # Weekly on Sunday
  push:
    paths:
      - 'docs/**'
  pull_request:
    paths:
      - 'docs/**'

jobs:
  staleness:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Check staleness
        run: bash scripts/check-doc-staleness.sh

  coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Check coverage
        run: |
          pnpm install
          pnpm run docs:coverage
          coverage=$(pnpm run docs:coverage --json | jq '.overall')
          if [ $coverage -lt 80 ]; then
            echo "❌ Coverage $coverage% < 80%"
            exit 1
          fi

  links:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Check internal links
        run: bash scripts/check-doc-links.sh
      - name: Check external links
        run: bash scripts/check-external-links.sh

  orphans:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Find orphans
        run: bash scripts/find-orphans.sh

  report:
    needs: [staleness, coverage, links, orphans]
    runs-on: ubuntu-latest
    if: always()
    steps:
      - name: Generate report
        run: |
          echo "# Documentation Health Report" > report.md
          echo "" >> report.md
          echo "Generated: $(date)" >> report.md
          # Aggregate results from previous jobs

      - name: Comment on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs')
            const report = fs.readFileSync('report.md', 'utf8')
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.name,
              body: report
            })
```

---

### Alert Configuration

#### Slack Notifications

```typescript
// scripts/send-health-alert.ts

import { WebClient } from '@slack/web-api'

const slack = new WebClient(process.env.SLACK_TOKEN)

interface HealthReport {
  staleness: { stale: number; total: number }
  coverage: { current: number; target: number }
  links: { broken: number; total: number }
  orphans: { count: number }
}

async function sendAlert(report: HealthReport) {
  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '📚 Documentation Health Alert'
      }
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Stale Docs:*\n${report.staleness.stale}/${report.staleness.total}`
        },
        {
          type: 'mrkdwn',
          text: `*Coverage:*\n${report.coverage.current}% (target: ${report.coverage.target}%)`
        },
        {
          type: 'mrkdwn',
          text: `*Broken Links:*\n${report.links.broken}/${report.links.total}`
        },
        {
          type: 'mrkdwn',
          text: `*Orphan Docs:*\n${report.orphans.count}`
        }
      ]
    }
  ]

  await slack.chat.postMessage({
    channel: '#documentation',
    blocks
  })
}
```

---

#### Email Digest

```typescript
// scripts/send-health-digest.ts

import nodemailer from 'nodemailer'

async function sendWeeklyDigest(report: HealthReport) {
  const transporter = nodemailer.createTransporter({
    // Config
  })

  const html = `
    <h1>Weekly Documentation Health Report</h1>

    <h2>Staleness</h2>
    <p>Stale docs: ${report.staleness.stale}/${report.staleness.total}</p>
    <ul>
      ${report.staleness.docs.map(d => `<li>${d}</li>`).join('')}
    </ul>

    <h2>Coverage</h2>
    <p>Current: ${report.coverage.current}% (target: ${report.coverage.target}%)</p>

    <h2>Action Items</h2>
    <ul>
      <li>Review and update stale docs</li>
      <li>Document missing components</li>
      <li>Fix broken links</li>
    </ul>
  `

  await transporter.sendMail({
    from: 'docs@example.com',
    to: 'team@example.com',
    subject: 'Weekly Documentation Health Report',
    html
  })
}
```

---

### Dashboard

#### Health Dashboard

```typescript
// apps/docs-dashboard/src/App.tsx

function HealthDashboard() {
  const { data: health } = useQuery('health', fetchHealth)

  return (
    <div>
      <h1>Documentation Health</h1>

      <MetricCard
        title="Staleness"
        value={`${health.staleness.fresh}/${health.staleness.total}`}
        status={health.staleness.fresh / health.staleness.total > 0.7 ? 'good' : 'warning'}
      />

      <MetricCard
        title="Coverage"
        value={`${health.coverage.current}%`}
        target={health.coverage.target}
        status={health.coverage.current >= health.coverage.target ? 'good' : 'bad'}
      />

      <MetricCard
        title="Link Health"
        value={`${(health.links.working / health.links.total * 100).toFixed(1)}%`}
        status={health.links.working === health.links.total ? 'good' : 'warning'}
      />

      <MetricCard
        title="Orphans"
        value={health.orphans.count}
        status={health.orphans.count === 0 ? 'good' : 'warning'}
      />

      <h2>Stale Documents</h2>
      <DocList docs={health.staleness.stale_docs} />

      <h2>Missing Documentation</h2>
      <CodeEntityList entities={health.coverage.missing} />

      <h2>Broken Links</h2>
      <LinkList links={health.links.broken} />
    </div>
  )
}
```

---

### Maintenance Workflows

#### Weekly Review Process

**Every Sunday:**

1. **Run health check:**
   ```bash
   pnpm run docs:health-check
   ```

2. **Review staleness report:**
   - Identify docs > 90 days old
   - Assign review owners
   - Schedule updates

3. **Address coverage gaps:**
   - List undocumented components
   - Prioritize by importance
   - Create docs or tickets

4. **Fix broken links:**
   - Update moved files
   - Remove deleted references
   - Archive dead external links

5. **Handle orphans:**
   - Link from relevant docs
   - Add to index files
   - Archive if no longer relevant

---

#### Monthly Deep Dive

**First of each month:**

1. **Coverage audit:**
   - Compare code changes vs doc updates
   - Identify systematically undocumented areas
   - Plan documentation sprints

2. **Quality review:**
   - Sample 10 random docs
   - Check accuracy against code
   - Verify completeness
   - Update as needed

3. **Structure review:**
   - Check if organization still makes sense
   - Identify reorganization needs
   - Plan structural improvements

4. **Metrics review:**
   - Trend analysis (improving or declining?)
   - Set goals for next month
   - Report to stakeholders

---

## Metrics & Goals

### Health Targets

**Target thresholds:**

| Metric | Good | Acceptable | Bad |
|--------|------|------------|-----|
| Staleness | <10% stale | 10-20% stale | >20% stale |
| Coverage | >80% | 70-80% | <70% |
| Link Health | 100% working | 95-99% | <95% |
| Orphans | 0 | 1-3 | >3 |

---

### Tracking Over Time

**Maintain historical data:**

```typescript
// docs-health-history.json

{
  "2026-01-19": {
    "staleness": { "fresh": 35, "aging": 10, "stale": 5 },
    "coverage": { "overall": 61 },
    "links": { "broken": 3, "total": 180 },
    "orphans": { "count": 2 }
  },
  "2026-01-12": {
    "staleness": { "fresh": 32, "aging": 12, "stale": 6 },
    "coverage": { "overall": 58 },
    "links": { "broken": 5, "total": 175 },
    "orphans": { "count": 3 }
  }
}
```

**Visualize trends:**
- Are we improving?
- Are specific metrics declining?
- What needs attention?

---

## Related Documentation

**Meta docs:**
- [Style Guide](style-guide.md) - Writing conventions
- [AI-First Principles](ai-first-principles.md) - AI optimization
- [Diátaxis Guide](diataxis-guide.md) - Document classification

**Implementation:**
- [Documentation Plan](../plans/active/2026-01-19-ai-first-documentation-system.md)

---

**Last Updated:** 2026-01-19
