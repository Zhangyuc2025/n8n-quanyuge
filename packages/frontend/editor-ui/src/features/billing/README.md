# Billing Store

Pinia store for managing workspace billing and usage information.

## Usage

```typescript
import { useBillingStore } from '@/features/billing/billing.store';

const billingStore = useBillingStore();

// Fetch balance
await billingStore.fetchBalance(workspaceId);

// Check if balance is low
if (billingStore.hasLowBalance) {
  // Show warning
}

// Get formatted balance
console.log(billingStore.formattedBalance); // "¥100.00"

// Fetch usage records
await billingStore.fetchUsageRecords(workspaceId, {
  startDate: '2025-01-01',
  endDate: '2025-01-31',
});

// Load more records (pagination)
await billingStore.loadMoreUsageRecords();

// Fetch usage summary for a specific month
await billingStore.fetchUsageSummary(workspaceId, 2025, 1);

// Initiate recharge
await billingStore.initiateRecharge(workspaceId, 100, 'alipay');

// Fetch recharge records
await billingStore.fetchRechargeRecords(workspaceId);
```

## State

- `balance`: Current workspace balance information
- `usageRecords`: Array of usage records
- `usagePagination`: Pagination info for usage records
- `rechargeRecords`: Array of recharge records
- `rechargePagination`: Pagination info for recharge records
- `usageSummary`: Monthly usage summary
- `loading`: Loading state
- `currentWorkspaceId`: Currently active workspace ID

## Computed Properties

- `hasLowBalance`: Boolean indicating if balance is below threshold
- `formattedBalance`: Formatted balance string with currency symbol
- `currencySymbol`: Currency symbol based on workspace currency

## Actions

### Balance Management

- `fetchBalance(workspaceId)`: Fetch workspace balance
- `refreshBalance()`: Refresh current workspace balance

### Usage Records

- `fetchUsageRecords(workspaceId, params?)`: Fetch usage records with optional filters
- `loadMoreUsageRecords()`: Load next page of usage records
- `fetchUsageSummary(workspaceId, year?, month?)`: Fetch monthly summary

### Recharge Management

- `fetchRechargeRecords(workspaceId, params?)`: Fetch recharge history
- `loadMoreRechargeRecords()`: Load next page of recharge records
- `initiateRecharge(workspaceId, amount, paymentMethod)`: Initiate a recharge

### Utilities

- `reset()`: Reset store to initial state

## Error Handling

All actions show toast notifications on error using `useToast()`. Errors are also re-thrown so you can handle them in components if needed.

```typescript
try {
  await billingStore.fetchBalance(workspaceId);
} catch (error) {
  // Handle error
}
```
