# Admin Service Methods Quick Reference

This document provides quick reference for all newly implemented admin methods.

---

## PlatformAIProviderService

### Location
`/packages/cli/src/services/platform-ai-provider.service.ts`

### Methods

#### `createProvider(data)`
```typescript
async createProvider(data: {
  providerKey: string;
  providerName: string;
  apiKey: string;
  apiEndpoint: string;
  modelsConfig: ModelsConfig;
  quotaConfig?: Record<string, unknown>;
  enabled?: boolean;
}): Promise<PlatformAIProvider>
```

#### `deleteProvider(providerKey)`
```typescript
async deleteProvider(providerKey: string): Promise<void>
```
Soft deletes by setting `isActive=false` and `enabled=false`.

#### `toggleProvider(providerKey, enabled)`
```typescript
async toggleProvider(providerKey: string, enabled: boolean): Promise<void>
```

#### `updateApiKey(providerKey, apiKey)`
```typescript
async updateApiKey(providerKey: string, apiKey: string): Promise<void>
```
Automatically encrypts the API key.

#### `updatePricing(providerKey, modelsConfig)`
```typescript
async updatePricing(providerKey: string, modelsConfig: ModelsConfig): Promise<void>
```

#### `getAllProviders(filters?)`
```typescript
async getAllProviders(filters?: {
  isActive?: boolean;
  enabled?: boolean;
}): Promise<PlatformAIProvider[]>
```

---

## PlatformNodeService

### Location
`/packages/cli/src/services/platform-node.service.ts`

### Methods

#### `createNode(data)`
```typescript
async createNode(data: {
  nodeKey: string;
  nodeName: string;
  nodeType: NodeType; // 'platform_official' | 'third_party_approved'
  nodeDefinition: Record<string, unknown>;
  nodeCode?: string;
  category?: string;
  description?: string;
  iconUrl?: string;
  version?: string;
  isBillable?: boolean;
  pricePerRequest?: number;
  submittedBy?: string;
}): Promise<PlatformNode>
```

#### `approveNode(nodeKey, reviewerId, reviewNotes?)`
```typescript
async approveNode(
  nodeKey: string,
  reviewerId: string,
  reviewNotes?: string
): Promise<void>
```
Sets status to 'approved' and auto-enables the node.

#### `rejectNode(nodeKey, reviewerId, reason)`
```typescript
async rejectNode(
  nodeKey: string,
  reviewerId: string,
  reason: string
): Promise<void>
```
Sets status to 'rejected' with reason in review notes.

---

## CustomNodeService

### Location
`/packages/cli/src/services/custom-node.service.ts`

### Methods

#### `createCustomNode(workspaceId, userId, data)`
```typescript
async createCustomNode(
  workspaceId: string,
  userId: string,
  data: {
    nodeKey: string;
    nodeName: string;
    nodeDefinition: Record<string, unknown>;
    nodeCode: string;
    configMode?: ConfigMode; // 'personal' | 'shared'
    configSchema?: Record<string, unknown>;
    category?: string;
    description?: string;
    iconUrl?: string;
    version?: string;
  }
): Promise<CustomNode>
```

#### `updateCustomNode(nodeId, data)`
```typescript
async updateCustomNode(
  nodeId: string,
  data: {
    nodeName?: string;
    nodeDefinition?: Record<string, unknown>;
    nodeCode?: string;
    configMode?: ConfigMode;
    configSchema?: Record<string, unknown>;
    category?: string;
    description?: string;
    iconUrl?: string;
    version?: string;
  }
): Promise<void>
```
No workspace permission check - admin can update any node.

#### `deleteCustomNode(nodeId)`
```typescript
async deleteCustomNode(nodeId: string): Promise<void>
```
Hard deletes the node - no workspace permission check.

#### `updateSharedConfig(nodeId, config)`
```typescript
async updateSharedConfig(
  nodeId: string,
  config: Record<string, unknown>
): Promise<void>
```
Encrypts config data before storage. Only works for nodes in 'shared' mode.

---

## Type Definitions

### ModelsConfig
```typescript
interface ModelsConfig {
  models: AIModel[];
}

interface AIModel {
  id: string;
  name: string;
  description: string;
  pricePerToken: number;
  currency: string;
  contextWindow: number;
  maxOutputTokens: number;
  supportsFunctions: boolean;
  supportsVision: boolean;
}
```

### NodeType
```typescript
type NodeType = 'platform_official' | 'third_party_approved';
```

### ConfigMode
```typescript
type ConfigMode = 'personal' | 'shared';
```

### SubmissionStatus
```typescript
type CustomNodeSubmissionStatus = 'draft' | 'pending' | 'approved' | 'rejected';
type PlatformNodeSubmissionStatus = 'approved' | 'rejected' | null;
```

---

## Error Classes

All methods can throw the following errors:

### PlatformAIProviderService
- `ProviderNotFoundError` - Provider doesn't exist
- `UserError` - Provider already exists (on create)

### PlatformNodeService
- `PlatformNodeNotFoundError` - Node doesn't exist
- `UserError` - Node already exists or invalid operation

### CustomNodeService
- `CustomNodeNotFoundError` - Node doesn't exist
- `UserError` - Node already exists or invalid config mode

---

## Usage Examples

### Creating an AI Provider

```typescript
const provider = await platformAIProviderService.createProvider({
  providerKey: 'openai',
  providerName: 'OpenAI',
  apiKey: 'sk-...',
  apiEndpoint: 'https://api.openai.com',
  modelsConfig: {
    models: [
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        description: 'Most capable GPT-4 model',
        pricePerToken: 0.00001,
        currency: 'CNY',
        contextWindow: 128000,
        maxOutputTokens: 4096,
        supportsFunctions: true,
        supportsVision: false
      }
    ]
  },
  quotaConfig: {
    monthlyTokens: 10000000,
    currentUsed: 0
  },
  enabled: true
});
```

### Approving a Third-Party Node

```typescript
await platformNodeService.approveNode(
  'custom-weather-api',
  reviewerId,
  'Approved: Code review passed, security audit complete'
);
```

### Creating a Custom Node for a Workspace

```typescript
const node = await customNodeService.createCustomNode(
  workspaceId,
  userId,
  {
    nodeKey: 'my-custom-node',
    nodeName: 'My Custom Node',
    nodeDefinition: { /* INodeTypeDescription */ },
    nodeCode: 'export class MyCustomNode { ... }',
    configMode: 'shared',
    category: 'custom'
  }
);
```

### Updating Shared Configuration

```typescript
await customNodeService.updateSharedConfig(
  nodeId,
  {
    apiKey: 'team-shared-key',
    endpoint: 'https://api.example.com',
    timeout: 30000
  }
);
// Config is automatically encrypted before storage
```

---

## Notes

1. **Encryption**: All API keys and shared configs are automatically encrypted using the Cipher service
2. **Soft Delete**: AI providers use soft delete (isActive=false) to maintain data integrity
3. **Auto-enable**: Approved third-party nodes are automatically enabled
4. **Workspace Scope**: Custom nodes are scoped to workspaces, but admin methods bypass permission checks
5. **Validation**: All create operations validate uniqueness before insertion

---

## Related Files

- Entities: `/packages/@n8n/db/src/entities/`
  - `platform-ai-provider.entity.ts`
  - `platform-node.entity.ts`
  - `custom-node.entity.ts`

- Repositories: `/packages/@n8n/db/src/repositories/`
  - `platform-ai-provider.repository.ts`
  - `platform-node.repository.ts`
  - `custom-node.repository.ts`

- Controllers: `/packages/cli/src/controllers/`
  - `admin-platform-ai-providers.controller.ts`
  - (Future: admin-platform-nodes.controller.ts)
  - (Future: admin-custom-nodes.controller.ts)
