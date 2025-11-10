# n8n Credentials System - Comprehensive Analysis Report

**Generated**: November 10, 2025
**Scope**: Complete credentials system removal from n8n codebase
**Target Packages**: /home/zhang/n8n-quanyuge/packages

---

## Executive Summary

The n8n credentials system is deeply integrated across the codebase with **~200+ files** requiring modification or deletion. The system spans:
- Database layer (Entity, Repository, Migrations)
- Backend services (Controllers, Services, API handlers)
- Frontend components (Vue components, Stores, APIs)
- Testing infrastructure
- Configuration and utilities
- Node credential definitions

---

## 1. BACKEND DATABASE LAYER (Must Delete/Modify)

### Core Entity Files
| File | Type | Action | Notes |
|------|------|--------|-------|
| `/home/zhang/n8n-quanyuge/packages/@n8n/db/src/entities/credentials-entity.ts` | Entity | **DELETE** | Defines CredentialsEntity - core DB model. 43 lines. Extends WithTimestampsAndStringId with name, data, type, projectId, isManaged columns |
| `/home/zhang/n8n-quanyuge/packages/@n8n/db/src/repositories/credentials.repository.ts` | Repository | **DELETE** | Database access layer for credentials |

### Database Migrations (Must Preserve or Revert)
These migrations should be either:
1. **Preserved** if historical (for existing databases)
2. **Removed** if part of current development branch
3. **Modified** to drop credentials tables

| File | Action | Notes |
|------|--------|-------|
| `1630330987096-UpdateWorkflowCredentials.ts` | MODIFY | Workflow credential references |
| `1734479635324-AddManagedColumnToCredentialsTable.ts` | DELETE | Added isManaged column (recent) |
| `1762511302880-CreateWorkspacePluginCredentialsTable.ts` | DELETE | Created workspace plugin credentials table |
| `1762511301780-MultitenantTransformation.ts` | **CRITICAL** | Complex migration: migrates credential ownership from shared_credentials table to projectId columns. **MUST ANALYZE** before deletion |

Also check MySQL/PostgreSQL/SQLite specific migrations in:
- `/home/zhang/n8n-quanyuge/packages/@n8n/db/src/migrations/mysqldb/`
- `/home/zhang/n8n-quanyuge/packages/@n8n/db/src/migrations/postgresdb/`
- `/home/zhang/n8n-quanyuge/packages/@n8n/db/src/migrations/sqlite/`

The following related migrations exist:
- `1646992772331-CreateUserManagement.ts` (creates shared_credentials table)
- `1665484192213-CreateCredentialUsageTable.ts`
- `1665754637026-RemoveCredentialUsageTable.ts`

---

## 2. CLI/BACKEND - CREDENTIALS MODULE (Core - Must Delete)

### Main Module Files
| File | Type | Lines | Action |
|------|------|-------|--------|
| `/home/zhang/n8n-quanyuge/packages/cli/src/credentials/credentials.service.ts` | Service | 675 | **DELETE** | 
| `/home/zhang/n8n-quanyuge/packages/cli/src/credentials/credentials.controller.ts` | Controller | 391 | **DELETE** |
| `/home/zhang/n8n-quanyuge/packages/cli/src/credentials/credentials.service.ee.ts` | Service (EE) | - | **DELETE** |
| `/home/zhang/n8n-quanyuge/packages/cli/src/credentials/credentials-finder.service.ts` | Service | - | **DELETE** |

### Supporting Error Classes
| File | Action |
|------|--------|
| `/home/zhang/n8n-quanyuge/packages/cli/src/errors/credential-not-found.error.ts` | **DELETE** |
| `/home/zhang/n8n-quanyuge/packages/cli/src/errors/credentials-overwrites-already-set.error.ts` | **DELETE** |
| `/home/zhang/n8n-quanyuge/packages/cli/src/errors/response-errors/transfer-credential.error.ts` | **DELETE** |

### Utility Files
| File | Action | Notes |
|------|--------|-------|
| `/home/zhang/n8n-quanyuge/packages/cli/src/credentials-helper.ts` | **DELETE** | Helpers for credential operations |
| `/home/zhang/n8n-quanyuge/packages/cli/src/credentials-overwrites.ts` | **DELETE** | Credential overwrite logic |
| `/home/zhang/n8n-quanyuge/packages/cli/src/credential-types.ts` | **DELETE** | Credential type definitions |
| `/home/zhang/n8n-quanyuge/packages/cli/src/load-nodes-and-credentials.ts` | **MODIFY** | Remove credential loading logic, keep node loading |

### Test Files (Delete with main module)
| File | Action |
|------|--------|
| `/home/zhang/n8n-quanyuge/packages/cli/src/credentials/__tests__/credentials.service.test.ts` | **DELETE** |
| `/home/zhang/n8n-quanyuge/packages/cli/src/credentials/__tests__/credentials.test-data.ts` | **DELETE** |
| `/home/zhang/n8n-quanyuge/packages/cli/src/databases/repositories/__tests__/credentials.repository.test.ts` | **DELETE** |

---

## 3. CLI/BACKEND - PUBLIC API HANDLERS (REST API - Must Delete)

### Entire Directory
`/home/zhang/n8n-quanyuge/packages/cli/src/public-api/v1/handlers/credentials/` - **DELETE ENTIRE DIRECTORY**

### Files Within
| File | Type | Action |
|------|------|--------|
| `credentials.service.ts` | Service | DELETE |
| `credentials.handler.ts` | Handler | DELETE |
| `credentials.middleware.ts` | Middleware | DELETE |
| `spec/paths/credentials.yml` | Spec | DELETE |
| `spec/paths/credentials.id.yml` | Spec | DELETE |
| `spec/paths/credentials.id.transfer.yml` | Spec | DELETE |
| `spec/paths/credentials.schema.id.yml` | Spec | DELETE |
| `spec/schemas/credential.yml` | Spec | DELETE |
| `spec/schemas/credentialType.yml` | Spec | DELETE |
| `spec/schemas/create-credential-response.yml` | Spec | DELETE |
| `spec/schemas/parameters/credentialId.yml` | Spec | DELETE |

These define the REST API endpoints for credentials management.

---

## 4. CLI/BACKEND - OAUTH CONTROLLERS (Must Delete)

| File | Type | Action |
|------|------|--------|
| `/home/zhang/n8n-quanyuge/packages/cli/src/controllers/oauth/oauth1-credential.controller.ts` | Controller | **DELETE** |
| `/home/zhang/n8n-quanyuge/packages/cli/src/controllers/oauth/oauth2-credential.controller.ts` | Controller | **DELETE** |
| `/home/zhang/n8n-quanyuge/packages/cli/src/controllers/oauth/__tests__/oauth1-credential.controller.test.ts` | Test | **DELETE** |
| `/home/zhang/n8n-quanyuge/packages/cli/src/controllers/oauth/__tests__/oauth2-credential.controller.test.ts` | Test | **DELETE** |

---

## 5. CLI/BACKEND - SERVICES & MIDDLEWARE (Must Delete/Modify)

### Services
| File | Action | Notes |
|------|--------|-------|
| `/home/zhang/n8n-quanyuge/packages/cli/src/services/credentials-tester.service.ts` | **DELETE** | Tests credential functionality |
| `/home/zhang/n8n-quanyuge/packages/cli/src/services/__tests__/credentials-tester.service.test.ts` | **DELETE** | |
| `/home/zhang/n8n-quanyuge/packages/cli/src/services/__tests__/credentials-finder.service.test.ts` | **DELETE** | |

### Middleware & DTOs
| File | Action | Notes |
|------|--------|-------|
| `/home/zhang/n8n-quanyuge/packages/cli/src/middlewares/list-query/dtos/credentials.select.dto.ts` | **DELETE** | List query DTOs for credentials |
| `/home/zhang/n8n-quanyuge/packages/cli/src/middlewares/list-query/dtos/credentials.filter.dto.ts` | **DELETE** | |

### Other Modules
| File | Action | Notes |
|------|--------|-------|
| `/home/zhang/n8n-quanyuge/packages/cli/src/modules/chat-hub/chat-hub-credentials.service.ts` | **MODIFY** | Remove credential references from chat hub |
| `/home/zhang/n8n-quanyuge/packages/cli/src/executions/pre-execution-checks/credentials-permission-checker.ts` | **DELETE** | |
| `/home/zhang/n8n-quanyuge/packages/cli/src/executions/pre-execution-checks/__tests__/credentials-permission-checker.test.ts` | **DELETE** | |
| `/home/zhang/n8n-quanyuge/packages/cli/src/security-audit/risk-reporters/credentials-risk-reporter.ts` | **DELETE** | |

### Commands
| File | Action |
|------|--------|
| `/home/zhang/n8n-quanyuge/packages/cli/src/commands/import/credentials.ts` | **DELETE** |
| `/home/zhang/n8n-quanyuge/packages/cli/src/commands/export/credentials.ts` | **DELETE** |

### Source Control (EE)
| File | Action |
|------|--------|
| `/home/zhang/n8n-quanyuge/packages/cli/src/environments.ee/source-control/types/exportable-credential.ts` | **DELETE** |

### Email Templates
| File | Action |
|------|--------|
| `/home/zhang/n8n-quanyuge/packages/cli/src/user-management/email/templates/credentials-shared.mjml` | **DELETE** |

---

## 6. CLI/BACKEND - TEST FILES (Integration & Unit Tests)

| Directory/File | Action |
|---|---|
| `/home/zhang/n8n-quanyuge/packages/cli/test/integration/credentials/` | **DELETE** |
| `/home/zhang/n8n-quanyuge/packages/cli/test/integration/commands/import-credentials/` | **DELETE** |
| `/home/zhang/n8n-quanyuge/packages/cli/src/__tests__/credential-types.test.ts` | **DELETE** |
| `/home/zhang/n8n-quanyuge/packages/cli/src/__tests__/credentials-helper.test.ts` | **DELETE** |
| `/home/zhang/n8n-quanyuge/packages/cli/src/__tests__/credentials-overwrites.test.ts` | **DELETE** |

---

## 7. API TYPES & CONFIGURATION (Must Delete/Modify)

### API Types DTOs
| Directory | Action | Notes |
|---|---|---|
| `/home/zhang/n8n-quanyuge/packages/@n8n/api-types/src/dto/credentials/` | **DELETE** | Contains credential DTOs |

Contains:
- `credentials-get-one-request.dto.ts`
- `credentials-get-many-request.dto.ts`
- `create-credential.dto.ts`
- `generate-credential-name.dto.ts`
- All `__tests__` files

### Configuration
| File | Action |
|---|---|
| `/home/zhang/n8n-quanyuge/packages/@n8n/config/src/configs/credentials.config.ts` | **DELETE** |

---

## 8. CORE PACKAGE (Runtime Credentials Support - Must Delete)

| File | Type | Action | Notes |
|---|---|---|---|
| `/home/zhang/n8n-quanyuge/packages/core/src/credentials.ts` | Core | **DELETE** | Core credential runtime support |
| `/home/zhang/n8n-quanyuge/packages/core/src/__tests__/credentials.test.ts` | Test | **DELETE** | |
| `/home/zhang/n8n-quanyuge/packages/core/src/errors/unrecognized-credential-type.error.ts` | Error | **DELETE** | |
| `/home/zhang/n8n-quanyuge/packages/core/src/execution-engine/node-execution-context/credentials-test-context.ts` | Context | **DELETE** | |
| `/home/zhang/n8n-quanyuge/packages/core/nodes-testing/credential-types.ts` | Testing | **DELETE** | |
| `/home/zhang/n8n-quanyuge/packages/core/nodes-testing/credentials-helper.ts` | Testing | **DELETE** | |
| `/home/zhang/n8n-quanyuge/packages/core/nodes-testing/load-nodes-and-credentials.ts` | Testing | **MODIFY** | Keep node loading, remove credential loading |

---

## 9. FRONTEND - CREDENTIALS FEATURE (Entire Module - Must Delete)

### Directory
`/home/zhang/n8n-quanyuge/packages/frontend/editor-ui/src/features/credentials/` - **DELETE ENTIRE DIRECTORY**

This contains ~57 files including:

#### Store & API
| File | Action |
|---|---|
| `credentials.store.ts` | **DELETE** |
| `credentials.api.ts` | **DELETE** |
| `credentials.ee.api.ts` | **DELETE** |

#### Types & Constants
| File | Action |
|---|---|
| `credentials.types.ts` | **DELETE** |
| `credentials.constants.ts` | **DELETE** |

#### Components
| Component | Action | Purpose |
|---|---|---|
| `CredentialIcon.vue` | **DELETE** | Displays credential icons |
| `CredentialCard.vue` | **DELETE** | Credential list card |
| `NodeCredentials.vue` | **DELETE** | Node credential selector |
| `CredentialsSelectModal.vue` | **DELETE** | Modal for selecting credentials |
| `CredentialsSelect.vue` | **DELETE** | Credential selection component |
| `ScopesNotice.vue` | **DELETE** | OAuth scopes notice |

#### CredentialEdit Sub-components
| Component | Action |
|---|---|
| `CredentialEdit.vue` | **DELETE** |
| `CredentialInfo.vue` | **DELETE** |
| `CredentialConfig.vue` | **DELETE** |
| `CredentialInputs.vue` | **DELETE** |
| `CredentialSharing.ee.vue` | **DELETE** |
| `AuthTypeSelector.vue` | **DELETE** |
| `GoogleAuthButton.vue` | **DELETE** |
| `OauthButton.vue` | **DELETE** |

#### CredentialPicker Sub-components
| Component | Action |
|---|---|
| `CredentialPicker.vue` | **DELETE** |
| `CredentialsDropdown.vue` | **DELETE** |

#### Views
| File | Action |
|---|---|
| `views/CredentialsView.vue` | **DELETE** |

#### Composables
| File | Action |
|---|---|
| `composables/useNodeCredentialOptions.ts` | **DELETE** |

#### All Test Files
| Pattern | Action |
|---|---|
| `*.test.ts` in credentials folder | **DELETE** |

---

## 10. FRONTEND - RELATED COMPONENTS (Must Modify)

### Workflow Templates
| File | Action | Notes |
|---|---|---|
| `/home/zhang/n8n-quanyuge/packages/frontend/editor-ui/src/features/workflows/templates/composables/useCredentialSetupState.ts` | **DELETE** | Credential setup state |
| `/home/zhang/n8n-quanyuge/packages/frontend/editor-ui/src/features/workflows/templates/composables/useSetupWorkflowCredentialsModalState.ts` | **DELETE** | |
| `/home/zhang/n8n-quanyuge/packages/frontend/editor-ui/src/features/workflows/templates/components/SetupWorkflowCredentialsButton.vue` | **DELETE** | |
| `/home/zhang/n8n-quanyuge/packages/frontend/editor-ui/src/features/workflows/templates/components/SetupWorkflowCredentialsModal.vue` | **DELETE** | |

### Collaboration/Projects
| File | Action |
|---|---|
| `/home/zhang/n8n-quanyuge/packages/frontend/editor-ui/src/features/collaboration/projects/components/ProjectMoveResourceModalCredentialsList.vue` | **DELETE** |

### AI/Chat Hub
| File | Action |
|---|---|
| `/home/zhang/n8n-quanyuge/packages/frontend/editor-ui/src/features/ai/chatHub/components/CredentialSelectorModal.vue` | **DELETE** |
| `/home/zhang/n8n-quanyuge/packages/frontend/editor-ui/src/features/ai/chatHub/composables/useChatCredentials.ts` | **DELETE** |

### Command Bar
| File | Action |
|---|---|
| `/home/zhang/n8n-quanyuge/packages/frontend/editor-ui/src/features/shared/commandBar/composables/useCredentialNavigationCommands.ts` | **DELETE** |
| `/home/zhang/n8n-quanyuge/packages/frontend/editor-ui/src/features/shared/commandBar/composables/useCredentialNavigationCommands.test.ts` | **DELETE** |

### Utils
| File | Action | Notes |
|---|---|---|
| `/home/zhang/n8n-quanyuge/packages/frontend/editor-ui/src/app/utils/credentialOnlyNodes.ts` | **MODIFY** | May need to keep or update if nodes are still credential-only in concept |

---

## 11. FRONTEND - TEST UTILITIES (Must Delete)

| File | Action | Scope |
|---|---|---|
| `/home/zhang/n8n-quanyuge/packages/frontend/editor-ui/src/__tests__/server/endpoints/credential.ts` | **DELETE** | Credential endpoint mock |
| `/home/zhang/n8n-quanyuge/packages/frontend/editor-ui/src/__tests__/server/endpoints/credentialType.ts` | **DELETE** | Credential type endpoint mock |
| `/home/zhang/n8n-quanyuge/packages/frontend/editor-ui/src/__tests__/server/factories/credential.ts` | **DELETE** | Test data factory |
| `/home/zhang/n8n-quanyuge/packages/frontend/editor-ui/src/__tests__/server/factories/credentialType.ts` | **DELETE** | Test data factory |
| `/home/zhang/n8n-quanyuge/packages/frontend/editor-ui/src/__tests__/server/models/credential.ts` | **DELETE** | Test model |
| `/home/zhang/n8n-quanyuge/packages/frontend/editor-ui/src/__tests__/server/models/credentialType.ts` | **DELETE** | Test model |

---

## 12. NODES - CREDENTIAL DEFINITIONS (Must Delete)

### Main Credentials Directory
| Directory | Action | Notes |
|---|---|---|
| `/home/zhang/n8n-quanyuge/packages/nodes-base/credentials/` | **DELETE** | Contains hundreds of credential definitions for all integrations |
| `/home/zhang/n8n-quanyuge/packages/@n8n/nodes-langchain/credentials/` | **DELETE** | LangChain credential definitions |

**Important**: These directories contain credential definitions for all supported services (Google, GitHub, Slack, etc.). Total file count: Hundreds

Example credential files to delete:
- Google OAuth2 credentials
- Slack API credentials
- GitHub OAuth credentials
- AWS credentials
- And 200+ more...

---

## 13. NODES - BACKUP DIRECTORIES (Already to be deleted)

| Directory | Action | Notes |
|---|---|---|
| `/home/zhang/n8n-quanyuge/packages/nodes-base-backup/credentials/` | **DELETE** | Already identified as backup |
| `/home/zhang/n8n-quanyuge/packages/@n8n/nodes-langchain-backup/credentials/` | **DELETE** | Already identified as backup |

These contain backup copies of credential definitions.

---

## 14. PERMISSIONS & SHARING (Enterprise Edition)

| File | Action |
|---|---|
| `/home/zhang/n8n-quanyuge/packages/@n8n/permissions/src/roles/scopes/credential-sharing-scopes.ee.ts` | **DELETE** |

---

## 15. TESTING & DEVELOPMENT TOOLS

### Playwright Testing
| File | Action |
|---|---|
| `/home/zhang/n8n-quanyuge/packages/testing/playwright/composables/CredentialsComposer.ts` | **DELETE** |
| `/home/zhang/n8n-quanyuge/packages/testing/playwright/pages/CredentialsPage.ts` | **DELETE** |
| `/home/zhang/n8n-quanyuge/packages/testing/playwright/pages/TemplateCredentialSetupPage.ts` | **DELETE** |
| `/home/zhang/n8n-quanyuge/packages/testing/playwright/pages/WorkflowCredentialSetupModal.ts` | **DELETE** |

### Benchmark
| File | Action |
|---|---|
| `/home/zhang/n8n-quanyuge/packages/@n8n/benchmark/scenarios/credential-http-node/` | **DELETE** | Entire directory |
| `/home/zhang/n8n-quanyuge/packages/@n8n/benchmark/src/n8n-api-client/credentials-api-client.ts` | **DELETE** | |

### OAuth2 Client
| File | Action |
|---|---|
| `/home/zhang/n8n-quanyuge/packages/@n8n/client-oauth2/src/credentials-flow.ts` | **DELETE** | OAuth2 credential flow |
| `/home/zhang/n8n-quanyuge/packages/@n8n/client-oauth2/test/credentials-flow.test.ts` | **DELETE** | |

### Node CLI Templates
| Directory | Action | Notes |
|---|---|---|
| `/home/zhang/n8n-quanyuge/packages/@n8n/node-cli/src/template/templates/shared/credentials/` | **DELETE** | Template credentials for node generation |
| `/home/zhang/n8n-quanyuge/packages/@n8n/node-cli/src/template/templates/declarative/github-issues/template/credentials/` | **DELETE** | |

### ESLint Plugin Rules
| File | Action | Notes |
|---|---|---|
| `/home/zhang/n8n-quanyuge/packages/@n8n/eslint-plugin-community-nodes/src/rules/credential-documentation-url.ts` | **DELETE** | ESLint rules for credential validation |
| `/home/zhang/n8n-quanyuge/packages/@n8n/eslint-plugin-community-nodes/src/rules/credential-password-field.ts` | **DELETE** | |
| `/home/zhang/n8n-quanyuge/packages/@n8n/eslint-plugin-community-nodes/src/rules/credential-test-required.ts` | **DELETE** | |
| `/home/zhang/n8n-quanyuge/packages/@n8n/eslint-plugin-community-nodes/src/rules/no-credential-reuse.ts` | **DELETE** | |

All corresponding test files and documentation files should also be deleted.

---

## SUMMARY TABLE: Files to Delete vs Modify

### COMPLETE DELETION
| Category | Count | Directory |
|---|---|---|
| Database Entities | 1 | @n8n/db |
| Repositories | 1 | @n8n/db |
| CLI Services/Controllers | 8 | cli/credentials/ |
| Public API Handlers | 13 | cli/public-api/v1/handlers/credentials/ |
| OAuth Controllers | 4 | cli/controllers/oauth/ |
| CLI Utilities | 4 | cli/ |
| CLI Tests | 10+ | cli/ |
| Frontend Components | 50+ | frontend/editor-ui/features/credentials/ |
| Frontend Related | 15+ | frontend/editor-ui/ |
| Frontend Tests | 30+ | frontend/editor-ui/ |
| Core Runtime | 7 | core/ |
| API Types | 8+ | @n8n/api-types/ |
| Nodes Credentials | 500+ | nodes-base/, @n8n/nodes-langchain/ |
| Testing Tools | 15+ | testing/, benchmark/ |
| Development Tools | 20+ | eslint-plugin, node-cli, client-oauth2 |
| Migrations | 4+ | @n8n/db/migrations/ |
| **TOTAL** | **~700+** | **Multiple packages** |

### MODIFICATIONS NEEDED
| File | Change | Impact |
|---|---|---|
| `load-nodes-and-credentials.ts` (cli & core) | Remove credential loading | Keep node loading intact |
| `chat-hub-credentials.service.ts` | Remove credential references | Remove credential initialization |
| `credentialOnlyNodes.ts` | Review/Remove | Depends on new auth model |
| Database schema files | Schema updates needed | Drop credential tables |
| Workflow entity references | Remove credential relationships | Keep other workflow data |
| Node execution context | Remove credential injection | Keep execution context |

---

## CRITICAL CONCERNS

### 1. **Database Migration Chain** (PRIORITY: CRITICAL)
The migration `1762511301780-MultitenantTransformation.ts` is complex and:
- Migrates credential ownership from `shared_credentials` table to `projectId` columns
- Creates new tables
- Handles data transformation

**ACTION**: Must be analyzed in detail before deletion or must create new migrations to DROP credentials_entity table safely.

### 2. **Node Authentication** (PRIORITY: CRITICAL)
Current implementation:
- Nodes require credentials to authenticate with external services
- Credentials are injected during execution

**After Removal**:
- Nodes will fail to authenticate
- **MUST** have alternative auth mechanism in place before deletion

### 3. **Backward Compatibility** (PRIORITY: HIGH)
- Existing workflows reference credentials
- Databases contain credential data
- Need data migration strategy for existing deployments

### 4. **API Breaking Change** (PRIORITY: HIGH)
- All REST endpoints under `/api/v1/credentials/` will be removed
- Any external integrations using this API will break
- Deprecation period recommended

### 5. **Frontend Route Changes** (PRIORITY: HIGH)
- Existing routes like `/credentials` will disappear
- Users won't be able to manage credentials
- Alternative management interface needed

---

## EXECUTION STRATEGY

### Phase 1: Preparation
1. Backup current database schema
2. Create migration to handle credential data cleanup
3. Create deprecation warnings in API
4. Update frontend routes

### Phase 2: Backend Deletion (Safe Order)
1. Delete test files first
2. Delete Public API handlers
3. Delete Services/Controllers
4. Delete Utilities
5. Delete DTOs
6. Delete Database layer
7. Update migrations

### Phase 3: Frontend Deletion
1. Delete component tests
2. Delete components
3. Delete store/API
4. Delete views
5. Update related features

### Phase 4: Supporting Systems
1. Delete nodes/credentials
2. Delete testing tools
3. Delete development utilities
4. Delete ESLint rules

### Phase 5: Cleanup
1. Update imports across codebase
2. Fix compilation errors
3. Run tests
4. Verify no references remain

---

## VERIFICATION CHECKLIST

- [ ] All credential entity/repository files deleted
- [ ] All credential services deleted
- [ ] All credential API endpoints removed
- [ ] All credential UI components removed
- [ ] All credential stores/state removed
- [ ] All credential tests deleted
- [ ] All credential-related migrations handled
- [ ] Node credential definitions removed
- [ ] No remaining imports of deleted modules
- [ ] Codebase compiles cleanly
- [ ] All tests pass
- [ ] No credential references in CLI commands
- [ ] OAuth controllers removed
- [ ] No credential-only nodes logic
- [ ] Database schema updated to drop credentials tables

---

## FILE COUNT SUMMARY

- **Backend Services**: ~30 files
- **Database Layer**: 2 files + migrations
- **Frontend Components**: 57+ files
- **Frontend Related**: 15+ files
- **API Types**: 8+ files
- **Core Package**: 7 files
- **Testing**: 15+ files
- **Development Tools**: 20+ files
- **Node Credentials**: 500+ files
- **Migrations**: 4+ files
- **Configuration**: 1 file
- **Permissions**: 1 file
- **ESLint Rules**: 8 files (with tests & docs)

**ESTIMATED TOTAL: ~700-800 files to delete or modify**

---

## NOTES FOR DEVELOPER

1. Start with small, isolated deletions (error classes, constants)
2. Delete tests before implementation to avoid cascading failures
3. Keep database migrations until cleanup strategy is finalized
4. Update import statements systematically
5. Run `pnpm typecheck` after each major phase
6. Verify no circular dependencies are created
7. Update documentation for any removed features
8. Create comprehensive migration guide for users

