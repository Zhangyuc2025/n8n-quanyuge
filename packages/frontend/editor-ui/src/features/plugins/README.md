# Plugins Store

Pinia store for managing workspace plugins, including platform plugins, third-party plugins, and custom plugins.

## Usage

```typescript
import { usePluginsStore } from '@/features/plugins/plugins.store';

const pluginsStore = usePluginsStore();

// Fetch all available plugins for a workspace
await pluginsStore.fetchAvailablePlugins(workspaceId);

// Fetch custom plugins
await pluginsStore.fetchMyPlugins(workspaceId);

// Upload a new plugin
const file = new File([pluginCode], 'plugin.js');
await pluginsStore.uploadPlugin(workspaceId, file, {
  serviceKey: 'custom-plugin',
  serviceName: 'My Custom Plugin',
  category: 'AI',
  description: 'A custom AI plugin',
  pluginVersion: '1.0.0',
});

// Configure credentials for a user-managed plugin
await pluginsStore.configureCredentials(workspaceId, 'openai', {
  apiKey: 'sk-...',
  baseUrl: 'https://api.openai.com',
});

// Submit plugin for platform approval
await pluginsStore.submitPlugin(workspaceId, 'custom-plugin');

// Update an existing plugin
await pluginsStore.updatePlugin(workspaceId, 'custom-plugin', file, {
  description: 'Updated description',
  pluginVersion: '1.1.0',
});

// Delete a plugin
await pluginsStore.deletePlugin(workspaceId, 'custom-plugin');
```

## State

- `allPlugins`: All plugins (global and third-party approved)
- `availablePlugins`: Plugins available to current workspace
- `myPlugins`: Custom plugins created by workspace
- `selectedPlugin`: Currently selected plugin
- `pluginCredentials`: Map of plugin credentials (key: serviceKey)
- `loading`: Loading state
- `currentWorkspaceId`: Currently active workspace ID

## Computed Properties

### Plugin Categories

- `platformPlugins`: Platform-managed global plugins
- `thirdPartyPlugins`: Third-party approved user-managed plugins
- `customPlugins`: Workspace custom plugins
- `pendingPlugins`: Plugins pending approval

### Plugin Organization

- `pluginsByCategory`: Plugins grouped by category (Map)
- `configuredPlugins`: Plugins with credentials configured
- `unconfiguredPlugins`: User-managed plugins without credentials

## Actions

### Plugin Management

- `fetchAllPlugins()`: Fetch all global and third-party plugins
- `fetchAvailablePlugins(workspaceId)`: Fetch plugins available to workspace
- `fetchMyPlugins(workspaceId)`: Fetch workspace custom plugins
- `selectPlugin(plugin)`: Select a plugin for viewing details
- `getPluginByKey(serviceKey)`: Get plugin by service key

### Custom Plugin Operations

- `uploadPlugin(workspaceId, file, metadata)`: Upload a new custom plugin
- `updatePlugin(workspaceId, serviceKey, file?, metadata?)`: Update existing plugin
- `deletePlugin(workspaceId, serviceKey)`: Delete custom plugin
- `submitPlugin(workspaceId, serviceKey)`: Submit plugin for platform review

### Credentials Management

- `configureCredentials(workspaceId, serviceKey, credentials)`: Configure plugin credentials
- `fetchCredentials(workspaceId, serviceKey)`: Fetch plugin credentials (masked)
- `deleteCredentials(workspaceId, serviceKey)`: Delete plugin credentials
- `isPluginConfigured(serviceKey)`: Check if plugin has credentials configured

### Utilities

- `reset()`: Reset store to initial state

## Plugin Types

### Platform Plugins
- Managed by platform
- Global visibility
- No credentials required from users
- Examples: Built-in AI services

### Third-Party Plugins
- User-managed
- Global visibility (approved by admin)
- Require user credentials
- Examples: OpenAI, Claude, etc.

### Custom Plugins
- Created by workspace
- Workspace visibility
- Can be submitted for platform approval
- Examples: Custom integrations

## Plugin Lifecycle

1. **Create**: Upload custom plugin code
2. **Test**: Test in workspace
3. **Submit**: Submit for platform review
4. **Review**: Admin approves/rejects
5. **Publish**: Approved plugins become third-party plugins

## Error Handling

All actions show toast notifications on error using `useToast()`. Errors are also re-thrown so you can handle them in components if needed.

```typescript
try {
  await pluginsStore.uploadPlugin(workspaceId, file, metadata);
} catch (error) {
  // Handle error
}
```

## Example: Using Plugins in Components

```vue
<script setup lang="ts">
import { usePluginsStore } from '@/features/plugins/plugins.store';
import { useWorkspacesStore } from '@/app/stores/workspaces.store';
import { onMounted } from 'vue';

const pluginsStore = usePluginsStore();
const workspacesStore = useWorkspacesStore();

onMounted(async () => {
  const workspaceId = workspacesStore.currentWorkspace?.id;
  if (workspaceId) {
    await pluginsStore.fetchAvailablePlugins(workspaceId);
  }
});

// Filter plugins by category
const aiPlugins = computed(() =>
  pluginsStore.availablePlugins.filter(p => p.category === 'AI')
);

// Check if plugin needs configuration
const needsSetup = (serviceKey: string) => {
  const plugin = pluginsStore.getPluginByKey(serviceKey);
  return plugin?.serviceMode === 'user_managed' && !plugin.isConfigured;
};
</script>
```
