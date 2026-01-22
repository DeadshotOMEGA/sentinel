# Test Scripts

Utility scripts for managing test infrastructure.

## cleanup-test-containers.sh

**Purpose**: Safely remove ONLY test containers without affecting development or production containers.

### Safety Features

1. **Label-Based Filtering**: Only removes containers with `sentinel.test=true` label
2. **Explicit Confirmation**: Asks for confirmation before removing (unless `--force`)
3. **Clear Reporting**: Shows exactly which containers will be removed
4. **Protected Containers**: Guarantees Grafana, Loki, Prometheus, and other containers are safe

### Usage

```bash
# From project root
pnpm test:clean              # Interactive (asks for confirmation)
pnpm test:clean:force        # Force (no confirmation)

# Direct script execution
./apps/backend/tests/scripts/cleanup-test-containers.sh
./apps/backend/tests/scripts/cleanup-test-containers.sh --force
```

### What It Does

1. **Finds** all Docker containers with label `sentinel.test=true`
2. **Lists** the containers with details (ID, image, status, name)
3. **Asks** for confirmation (unless `--force` flag)
4. **Stops** all matching containers
5. **Removes** all matching containers
6. **Reports** completion

### What It Protects

The script will **NEVER** affect:

- ✅ **Grafana** containers (no sentinel.test label)
- ✅ **Loki** containers (no sentinel.test label)
- ✅ **Prometheus** containers (no sentinel.test label)
- ✅ **Development database** containers (different or no label)
- ✅ **Production** containers (never have test labels)
- ✅ **Other projects** (use different labels or no labels)

### When to Use

Run this script when you encounter:

- **Test failures** with "constraint already exists" errors
- **Docker conflicts**: "Container removal already in progress"
- **Schema mismatches** after switching branches
- **Stale container state** from previous test runs

### Example Output

```bash
$ pnpm test:clean

🔍 Searching for Sentinel test containers...

Found 2 test container(s):

CONTAINER ID   IMAGE                  STATUS         NAMES
a1b2c3d4e5f6   postgres:15-alpine    Up 2 hours     testcontainers-postgres-123
g7h8i9j0k1l2   postgres:15-alpine    Exited (0)     testcontainers-postgres-456

⚠️  These containers will be STOPPED and REMOVED

Continue? (y/N) y

🧹 Stopping test containers...
🗑️  Removing test containers...

✅ Test container cleanup complete!

ℹ️  Development containers (Grafana, Loki, Prometheus) were NOT affected
ℹ️  To see remaining containers: docker ps -a
```

### Verification

To verify only test containers are targeted:

```bash
# Show ONLY test containers (what will be cleaned)
docker ps -a --filter "label=sentinel.test=true"

# Show ALL containers (to see what's protected)
docker ps -a

# Show specific containers (verify they're protected)
docker ps -a | grep -E "grafana|loki|prometheus"
```

### Technical Details

**Labels Used**:
- `sentinel.test=true` - Marks container as a test container
- `sentinel.project=backend-tests` - Identifies the project
- `sentinel.purpose=integration-testing` - Documents purpose

**Docker Command**:
```bash
docker ps -aq --filter "label=sentinel.test=true"
```

This command returns ONLY containers with the exact label, ensuring isolation.

### Troubleshooting

**No containers found**:
- Test containers may already be cleaned up
- Check if tests have run: `docker ps -a | grep testcontainers`

**Permission denied**:
- Script needs execute permission: `chmod +x cleanup-test-containers.sh`
- Docker commands may need sudo (check Docker group membership)

**Containers not removed**:
- Check if containers are running in another terminal
- Use `--force` flag to skip confirmation
- Manually inspect: `docker ps -a --filter "label=sentinel.test=true"`

---

**Related**: [Test Infrastructure Documentation](../CLAUDE.md#docker-container-management)
