# @n8n/shared

Shared components and utilities for SASA platform admin panel.

## 📦 Included

### Components
- **AdminTable** - Advanced data table with pagination, search, and sorting
- **AdminChart** - ECharts wrapper components (Line, Bar, Pie)
- **AdminDialog** - Reusable dialog components
- **AdminLayout** - Admin panel layout with sidebar and header

### Composables
- **useAdminApi** - Admin API request wrapper
- **usePermission** - Permission checking logic
- **useTableData** - Table data management
- **useAdminNotification** - Notification system

### Utils
- **adminApiClient** - Axios instance for admin API
- **formatter** - Data formatting utilities
- **validator** - Form validation helpers

## 🚀 Usage

```typescript
// In admin-panel
import { AdminTable } from '@n8n/shared/components/AdminTable';
import { useAdminApi } from '@n8n/shared/composables/useAdminApi';
```

## 🔧 Development

```bash
# Type check
pnpm typecheck
```
