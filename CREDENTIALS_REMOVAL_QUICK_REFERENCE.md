# Credentials System Removal - Quick Reference Guide

## Overview
Complete analysis of all credentials system files in n8n codebase.
Total files identified: **~65 key files + 500+ node credentials = ~700+ files**

## Critical Priorities (Do First)

### CRITICAL - Database Layer
```
DELETE: /packages/@n8n/db/src/entities/credentials-entity.ts
DELETE: /packages/@n8n/db/src/repositories/credentials.repository.ts
ANALYZE: /packages/@n8n/db/src/migrations/common/1762511301780-MultitenantTransformation.ts
```

### CRITICAL - Core Services (Will Break Everything)
```
DELETE: /packages/cli/src/credentials/credentials.service.ts (675 lines)
DELETE: /packages/cli/src/credentials/credentials.controller.ts (391 lines)
DELETE: /packages/core/src/credentials.ts
DELETE: /packages/@n8n/client-oauth2/src/credentials-flow.ts
```

### CRITICAL - REST API
```
DELETE DIRECTORY: /packages/cli/src/public-api/v1/handlers/credentials/
DELETE: /packages/cli/src/controllers/oauth/oauth1-credential.controller.ts
DELETE: /packages/cli/src/controllers/oauth/oauth2-credential.controller.ts
```

## By Category

### 1. Backend Services (30+ files)
Location: `/packages/cli/src/credentials/` and related
- Main service: 675 lines
- Main controller: 391 lines
- Supporting services, DTOs, tests

### 2. Database Layer (2 files + migrations)
Location: `/packages/@n8n/db/src/`
- Entity definition
- Repository implementation
- 4+ database migrations (careful with MultitenantTransformation)

### 3. Frontend (57+ files)
Location: `/packages/frontend/editor-ui/src/features/credentials/`
- Entire directory can be deleted
- Store, API, Components, Views, Tests

### 4. Node Credentials (500+ files)
Location: `/packages/nodes-base/credentials/` and `/packages/@n8n/nodes-langchain/credentials/`
- Credential definitions for all integrations
- Can be deleted when alternative auth is ready

### 5. API Types & Config (8+ files)
Location: `/packages/@n8n/api-types/src/dto/credentials/`
- DTOs for API
- Configuration files

### 6. Core Runtime (7 files)
Location: `/packages/core/src/`
- Credential runtime support
- Execution context
- Testing helpers

### 7. Development Tools
- ESLint rules (8 files with tests & docs)
- Node CLI templates
- Benchmark utilities
- Playwright testing pages

## Deletion Order (Recommended)

### Phase 1: Tests (Safe - No Circular Dependencies)
```bash
Delete all test files ending in .test.ts
Delete all files in __tests__ directories
```

### Phase 2: Isolated Utilities
```bash
Delete error classes (3 files)
Delete helpers and utilities
Delete configuration files
Delete DTO directories
```

### Phase 3: Core Services (Need Careful Import Updates)
```bash
Delete credentials module services
Delete credential type definitions
Delete credential overwrites
```

### Phase 4: API Layer
```bash
Delete entire /public-api/v1/handlers/credentials/ directory
Delete OAuth controllers
Delete API middleware
```

### Phase 5: Database
```bash
Delete Entity and Repository
Create migration to drop credentials tables
Handle existing data
```

### Phase 6: Frontend (Simplest)
```bash
Delete entire /features/credentials/ directory (57+ files)
Delete related components in other features
```

### Phase 7: Node Definitions
```bash
Delete /nodes-base/credentials/ (hundreds of files)
Delete /nodes-langchain/credentials/
```

### Phase 8: Supporting Systems
```bash
Delete ESLint rules
Delete testing utilities
Delete development tools
Delete backup directories
```

## File Counts by Package

| Package | CRITICAL | HIGH | MEDIUM | Total |
|---------|----------|------|--------|-------|
| @n8n/db | 2 | 4 | 0 | 6 |
| cli | 8 | 25+ | 5 | 38+ |
| @n8n/api-types | 0 | 8 | 0 | 8 |
| core | 3 | 4 | 0 | 7 |
| frontend | 10+ | 47+ | 0 | 57+ |
| nodes-base | 0 | 100+ | 400+ | 500+ |
| @n8n/nodes-langchain | 0 | 50+ | 50+ | 100+ |
| testing | 0 | 4 | 2 | 6 |
| Other packages | 0 | 25+ | 10+ | 35+ |
| **TOTAL** | **23** | **267+** | **467+** | **~757** |

## Critical Concerns

### 1. Node Authentication Will Break
- All nodes currently use credentials for auth
- **MUST** have replacement auth mechanism before deletion

### 2. Complex Migration (1762511301780)
- Migrates credential ownership to projectId columns
- **MUST** analyze before handling
- May need new migration for cleanup

### 3. API Breaking Change
- All `/api/v1/credentials/` endpoints disappear
- External integrations will fail

### 4. Backward Compatibility
- Existing workflows reference credentials
- Database migration needed for existing data

## Files to MODIFY (Not Delete)

```
/packages/cli/src/load-nodes-and-credentials.ts
  → Remove credential loading, keep node loading

/packages/core/nodes-testing/load-nodes-and-credentials.ts
  → Same as above

/packages/cli/src/modules/chat-hub/chat-hub-credentials.service.ts
  → Remove credential references

/packages/frontend/editor-ui/src/app/utils/credentialOnlyNodes.ts
  → Review if still needed
```

## Compilation Checks to Run

After each phase:
```bash
pnpm typecheck
pnpm lint
pnpm build
```

## Related Documentation

See detailed analysis in:
- `CREDENTIALS_SYSTEM_ANALYSIS.md` (560 lines - comprehensive)
- `CREDENTIALS_FILES_SUMMARY.csv` (65 rows - quick lookup)

## Quick Stats

- **Largest file**: `credentials.service.ts` (675 lines)
- **Most complex migration**: `1762511301780-MultitenantTransformation.ts`
- **Biggest directory**: `/nodes-base/credentials/` (100+ files)
- **Total credentials definitions**: 500+ files
- **Frontend components**: 50+ files
- **Database tables affected**: credentials_entity, shared_credentials

---

Generated: November 10, 2025
Scope: Complete credentials system removal
Estimated effort: 50-100 hours depending on complexity of auth replacement
