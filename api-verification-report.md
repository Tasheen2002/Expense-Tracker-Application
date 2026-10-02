# 🧪 API Verification Report

This report summarizes the status of all 140 frontend API client calls, verifying whether they map correctly to the API Gateway routing schema and have matching backend endpoint integration test coverage.

## Summary

- **Total API Client Calls**: 140
- **Working / Validated**: 112 (80%)
- **Not Working / Unvalidated**: 28

---

## Verification Table

| Feature Module | API Method | HTTP Verb | Client request Path | Gateway Route | Status | Details |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| approval-workflow | `listChains` | `GET` | `workspaces/${workspaceId}/approval-chains` | `/api/v1/workspaces/${workspaceId}/approval-chains` | ✅ WORKING | Verified & Tested |
| approval-workflow | `createChain` | `POST` | `workspaces/${workspaceId}/approval-chains` | `/api/v1/workspaces/${workspaceId}/approval-chains` | ✅ WORKING | Verified & Tested |
| approval-workflow | `getChain` | `GET` | `workspaces/${workspaceId}/approval-chains/${chainId}` | `/api/v1/workspaces/${workspaceId}/approval-chains/${chainId}` | ✅ WORKING | Verified & Tested |
| approval-workflow | `updateChain` | `PUT` | `workspaces/${workspaceId}/approval-chains/${chainId}` | `/api/v1/workspaces/${workspaceId}/approval-chains/${chainId}` | ✅ WORKING | Verified & Tested |
| approval-workflow | `deleteChain` | `DELETE` | `workspaces/${workspaceId}/approval-chains/${chainId}` | `/api/v1/workspaces/${workspaceId}/approval-chains/${chainId}` | ✅ WORKING | Verified & Tested |
| approval-workflow | `initiateWorkflow` | `POST` | `workspaces/${workspaceId}/workflows` | `/api/v1/workspaces/${workspaceId}/workflows` | ✅ WORKING | Verified & Tested |
| approval-workflow | `listPendingApprovals` | `GET` | `workspaces/${workspaceId}/workflows/pending-approvals?${queryParams.toString()}` | `/api/v1/workspaces/${workspaceId}/workflows/pending-approvals?${queryParams.toString()}` | ✅ WORKING | Verified & Tested |
| approval-workflow | `listUserWorkflows` | `GET` | `workspaces/${workspaceId}/workflows/user-workflows?${queryParams.toString()}` | `/api/v1/workspaces/${workspaceId}/workflows/user-workflows?${queryParams.toString()}` | ✅ WORKING | Verified & Tested |
| approval-workflow | `getWorkflow` | `GET` | `workspaces/${workspaceId}/workflows/${expenseId}` | `/api/v1/workspaces/${workspaceId}/workflows/${expenseId}` | ✅ WORKING | Verified & Tested |
| approval-workflow | `approveStep` | `POST` | `workspaces/${workspaceId}/workflows/${expenseId}/approve` | `/api/v1/workspaces/${workspaceId}/workflows/${expenseId}/approve` | ✅ WORKING | Verified & Tested |
| approval-workflow | `rejectStep` | `POST` | `workspaces/${workspaceId}/workflows/${expenseId}/reject` | `/api/v1/workspaces/${workspaceId}/workflows/${expenseId}/reject` | ✅ WORKING | Verified & Tested |
| approval-workflow | `delegateStep` | `POST` | `workspaces/${workspaceId}/workflows/${expenseId}/delegate` | `/api/v1/workspaces/${workspaceId}/workflows/${expenseId}/delegate` | ✅ WORKING | Verified & Tested |
| audit-compliance | `list` | `GET` | `workspaces/${workspaceId}/audit-logs?${queryParams.toString()}` | `/api/v1/workspaces/${workspaceId}/audit-logs?${queryParams.toString()}` | ✅ WORKING | Verified & Tested |
| audit-compliance | `getSummary` | `GET` | `workspaces/${workspaceId}/audit-logs/summary${queryString ? ` | `/api/v1/workspaces/${workspaceId}/audit-logs/summary${queryString ? ` | ✅ WORKING | Verified & Tested |
| audit-compliance | `getEntityHistory` | `GET` | `workspaces/${workspaceId}/audit-logs/entity-history?${queryParams.toString()}` | `/api/v1/workspaces/${workspaceId}/audit-logs/entity-history?${queryParams.toString()}` | ✅ WORKING | Verified & Tested |
| auth | `login` | `POST` | `auth/login` | `/api/v1/auth/login` | ❌ NOT WORKING | Gateway Route Mismatch |
| auth | `register` | `POST` | `auth/register` | `/api/v1/auth/register` | ❌ NOT WORKING | Gateway Route Mismatch |
| auth | `me` | `GET` | `auth/me` | `/api/v1/auth/me` | ❌ NOT WORKING | Gateway Route Mismatch |
| auth | `updateProfile` | `PATCH` | `users/${userId}` | `/api/v1/users/${userId}` | ❌ NOT WORKING | Gateway Route Mismatch |
| bank-feed-sync | `listConnections` | `GET` | `workspaces/${workspaceId}/bank-feed-sync/connections` | `/api/v1/workspaces/${workspaceId}/bank-feed-sync/connections` | ✅ WORKING | Verified & Tested |
| bank-feed-sync | `connectBank` | `POST` | `workspaces/${workspaceId}/bank-feed-sync/connections` | `/api/v1/workspaces/${workspaceId}/bank-feed-sync/connections` | ✅ WORKING | Verified & Tested |
| bank-feed-sync | `getConnection` | `GET` | `workspaces/${workspaceId}/bank-feed-sync/connections/${connectionId}` | `/api/v1/workspaces/${workspaceId}/bank-feed-sync/connections/${connectionId}` | ✅ WORKING | Verified & Tested |
| bank-feed-sync | `updateToken` | `PUT` | `workspaces/${workspaceId}/bank-feed-sync/connections/${connectionId}/token` | `/api/v1/workspaces/${workspaceId}/bank-feed-sync/connections/${connectionId}/token` | ✅ WORKING | Verified & Tested |
| bank-feed-sync | `deleteConnection` | `DELETE` | `workspaces/${workspaceId}/bank-feed-sync/connections/${connectionId}` | `/api/v1/workspaces/${workspaceId}/bank-feed-sync/connections/${connectionId}` | ✅ WORKING | Verified & Tested |
| bank-feed-sync | `listPendingTransactions` | `GET` | `workspaces/${workspaceId}/bank-feed-sync/transactions/pending${queryString ? ` | `/api/v1/workspaces/${workspaceId}/bank-feed-sync/transactions/pending${queryString ? ` | ✅ WORKING | Verified & Tested |
| bank-feed-sync | `getTransaction` | `GET` | `workspaces/${workspaceId}/bank-feed-sync/transactions/${transactionId}` | `/api/v1/workspaces/${workspaceId}/bank-feed-sync/transactions/${transactionId}` | ✅ WORKING | Verified & Tested |
| bank-feed-sync | `processTransaction` | `PUT` | `workspaces/${workspaceId}/bank-feed-sync/transactions/${transactionId}/process` | `/api/v1/workspaces/${workspaceId}/bank-feed-sync/transactions/${transactionId}/process` | ✅ WORKING | Verified & Tested |
| bank-feed-sync | `syncConnection` | `POST` | `workspaces/${workspaceId}/bank-feed-sync/connections/${connectionId}/sync` | `/api/v1/workspaces/${workspaceId}/bank-feed-sync/connections/${connectionId}/sync` | ✅ WORKING | Verified & Tested |
| bank-feed-sync | `getSyncHistory` | `GET` | `workspaces/${workspaceId}/bank-feed-sync/connections/${connectionId}/sync/history${queryString ? ` | `/api/v1/workspaces/${workspaceId}/bank-feed-sync/connections/${connectionId}/sync/history${queryString ? ` | ✅ WORKING | Verified & Tested |
| bank-feed-sync | `getSyncSession` | `GET` | `workspaces/${workspaceId}/bank-feed-sync/sync/${sessionId}` | `/api/v1/workspaces/${workspaceId}/bank-feed-sync/sync/${sessionId}` | ✅ WORKING | Verified & Tested |
| budget-management | `list` | `GET` | `workspaces/${workspaceId}/budgets${queryString ? ` | `/api/v1/workspaces/${workspaceId}/budgets${queryString ? ` | ✅ WORKING | Verified & Tested |
| budget-management | `create` | `POST` | `workspaces/${workspaceId}/budgets` | `/api/v1/workspaces/${workspaceId}/budgets` | ✅ WORKING | Verified & Tested |
| budget-management | `get` | `GET` | `workspaces/${workspaceId}/budgets/${budgetId}` | `/api/v1/workspaces/${workspaceId}/budgets/${budgetId}` | ✅ WORKING | Verified & Tested |
| budget-management | `update` | `PATCH` | `workspaces/${workspaceId}/budgets/${budgetId}` | `/api/v1/workspaces/${workspaceId}/budgets/${budgetId}` | ✅ WORKING | Verified & Tested |
| budget-management | `delete` | `DELETE` | `workspaces/${workspaceId}/budgets/${budgetId}` | `/api/v1/workspaces/${workspaceId}/budgets/${budgetId}` | ✅ WORKING | Verified & Tested |
| budget-management | `activate` | `POST` | `workspaces/${workspaceId}/budgets/${budgetId}/activate` | `/api/v1/workspaces/${workspaceId}/budgets/${budgetId}/activate` | ✅ WORKING | Verified & Tested |
| budget-management | `archive` | `POST` | `workspaces/${workspaceId}/budgets/${budgetId}/archive` | `/api/v1/workspaces/${workspaceId}/budgets/${budgetId}/archive` | ✅ WORKING | Verified & Tested |
| budget-management | `listAllocations` | `GET` | `workspaces/${workspaceId}/budgets/${budgetId}/allocations` | `/api/v1/workspaces/${workspaceId}/budgets/${budgetId}/allocations` | ✅ WORKING | Verified & Tested |
| budget-management | `addAllocation` | `POST` | `workspaces/${workspaceId}/budgets/${budgetId}/allocations` | `/api/v1/workspaces/${workspaceId}/budgets/${budgetId}/allocations` | ✅ WORKING | Verified & Tested |
| budget-management | `updateAllocation` | `PATCH` | `workspaces/${workspaceId}/budgets/${budgetId}/allocations/${allocationId}` | `/api/v1/workspaces/${workspaceId}/budgets/${budgetId}/allocations/${allocationId}` | ✅ WORKING | Verified & Tested |
| budget-management | `deleteAllocation` | `DELETE` | `workspaces/${workspaceId}/budgets/${budgetId}/allocations/${allocationId}` | `/api/v1/workspaces/${workspaceId}/budgets/${budgetId}/allocations/${allocationId}` | ✅ WORKING | Verified & Tested |
| budget-management | `listLimits` | `GET` | `workspaces/${workspaceId}/spending-limits${queryString ? ` | `/api/v1/workspaces/${workspaceId}/spending-limits${queryString ? ` | ✅ WORKING | Verified & Tested |
| budget-management | `createLimit` | `POST` | `workspaces/${workspaceId}/spending-limits` | `/api/v1/workspaces/${workspaceId}/spending-limits` | ✅ WORKING | Verified & Tested |
| budget-management | `deleteLimit` | `DELETE` | `workspaces/${workspaceId}/spending-limits/${limitId}` | `/api/v1/workspaces/${workspaceId}/spending-limits/${limitId}` | ✅ WORKING | Verified & Tested |
| budget-management | `listUnreadAlerts` | `GET` | `workspaces/${workspaceId}/budgets/alerts/unread` | `/api/v1/workspaces/${workspaceId}/budgets/alerts/unread` | ✅ WORKING | Verified & Tested |
| budget-planning | `listPlans` | `GET` | `workspaces/${workspaceId}/budget-plans${queryString ? ` | `/api/v1/workspaces/${workspaceId}/budget-plans${queryString ? ` | ✅ WORKING | Verified & Tested |
| budget-planning | `createPlan` | `POST` | `workspaces/${workspaceId}/budget-plans` | `/api/v1/workspaces/${workspaceId}/budget-plans` | ✅ WORKING | Verified & Tested |
| budget-planning | `getPlan` | `GET` | `workspaces/${workspaceId}/budget-plans/${planId}` | `/api/v1/workspaces/${workspaceId}/budget-plans/${planId}` | ✅ WORKING | Verified & Tested |
| budget-planning | `deletePlan` | `DELETE` | `workspaces/${workspaceId}/budget-plans/${planId}` | `/api/v1/workspaces/${workspaceId}/budget-plans/${planId}` | ✅ WORKING | Verified & Tested |
| budget-planning | `listForecasts` | `GET` | `workspaces/${workspaceId}/budget-plans/${planId}/forecasts` | `/api/v1/workspaces/${workspaceId}/budget-plans/${planId}/forecasts` | ✅ WORKING | Verified & Tested |
| budget-planning | `createForecast` | `POST` | `workspaces/${workspaceId}/budget-plans/${planId}/forecasts` | `/api/v1/workspaces/${workspaceId}/budget-plans/${planId}/forecasts` | ✅ WORKING | Verified & Tested |
| budget-planning | `deleteForecast` | `DELETE` | `workspaces/${workspaceId}/forecasts/${forecastId}` | `/api/v1/workspaces/${workspaceId}/forecasts/${forecastId}` | ✅ WORKING | Verified & Tested |
| budget-planning | `listForecastItems` | `GET` | `workspaces/${workspaceId}/forecasts/${forecastId}/items` | `/api/v1/workspaces/${workspaceId}/forecasts/${forecastId}/items` | ✅ WORKING | Verified & Tested |
| budget-planning | `createForecastItem` | `POST` | `workspaces/${workspaceId}/forecasts/${forecastId}/items` | `/api/v1/workspaces/${workspaceId}/forecasts/${forecastId}/items` | ✅ WORKING | Verified & Tested |
| budget-planning | `deleteForecastItem` | `DELETE` | `workspaces/${workspaceId}/forecast-items/${itemId}` | `/api/v1/workspaces/${workspaceId}/forecast-items/${itemId}` | ✅ WORKING | Verified & Tested |
| budget-planning | `listScenarios` | `GET` | `workspaces/${workspaceId}/budget-plans/${planId}/scenarios` | `/api/v1/workspaces/${workspaceId}/budget-plans/${planId}/scenarios` | ✅ WORKING | Verified & Tested |
| budget-planning | `createScenario` | `POST` | `workspaces/${workspaceId}/budget-plans/${planId}/scenarios` | `/api/v1/workspaces/${workspaceId}/budget-plans/${planId}/scenarios` | ✅ WORKING | Verified & Tested |
| budget-planning | `deleteScenario` | `DELETE` | `workspaces/${workspaceId}/scenarios/${scenarioId}` | `/api/v1/workspaces/${workspaceId}/scenarios/${scenarioId}` | ✅ WORKING | Verified & Tested |
| categorization-rules | `listRules` | `GET` | `workspaces/${workspaceId}/rules` | `/api/v1/workspaces/${workspaceId}/rules` | ✅ WORKING | Verified & Tested |
| categorization-rules | `createRule` | `POST` | `workspaces/${workspaceId}/rules` | `/api/v1/workspaces/${workspaceId}/rules` | ✅ WORKING | Verified & Tested |
| categorization-rules | `getRule` | `GET` | `workspaces/${workspaceId}/rules/${ruleId}` | `/api/v1/workspaces/${workspaceId}/rules/${ruleId}` | ✅ WORKING | Verified & Tested |
| categorization-rules | `updateRule` | `PUT` | `workspaces/${workspaceId}/rules/${ruleId}` | `/api/v1/workspaces/${workspaceId}/rules/${ruleId}` | ✅ WORKING | Verified & Tested |
| categorization-rules | `deleteRule` | `DELETE` | `workspaces/${workspaceId}/rules/${ruleId}` | `/api/v1/workspaces/${workspaceId}/rules/${ruleId}` | ✅ WORKING | Verified & Tested |
| categorization-rules | `getSuggestion` | `GET` | `workspaces/${workspaceId}/category-suggestions/${expenseId}` | `/api/v1/workspaces/${workspaceId}/category-suggestions/${expenseId}` | ❌ NOT WORKING | Missing integration test validation |
| categorization-rules | `applySuggestion` | `POST` | `workspaces/${workspaceId}/category-suggestions/${expenseId}/apply` | `/api/v1/workspaces/${workspaceId}/category-suggestions/${expenseId}/apply` | ❌ NOT WORKING | Missing integration test validation |
| cost-allocation | `listDepartments` | `GET` | `workspaces/${workspaceId}/departments${queryString ? ` | `/api/v1/workspaces/${workspaceId}/departments${queryString ? ` | ✅ WORKING | Verified & Tested |
| cost-allocation | `createDepartment` | `POST` | `workspaces/${workspaceId}/departments` | `/api/v1/workspaces/${workspaceId}/departments` | ✅ WORKING | Verified & Tested |
| cost-allocation | `updateDepartment` | `PUT` | `workspaces/${workspaceId}/departments/${departmentId}` | `/api/v1/workspaces/${workspaceId}/departments/${departmentId}` | ✅ WORKING | Verified & Tested |
| cost-allocation | `deleteDepartment` | `DELETE` | `workspaces/${workspaceId}/departments/${departmentId}` | `/api/v1/workspaces/${workspaceId}/departments/${departmentId}` | ✅ WORKING | Verified & Tested |
| cost-allocation | `activateDepartment` | `PATCH` | `workspaces/${workspaceId}/departments/${departmentId}/activate` | `/api/v1/workspaces/${workspaceId}/departments/${departmentId}/activate` | ✅ WORKING | Verified & Tested |
| cost-allocation | `listCostCenters` | `GET` | `workspaces/${workspaceId}/cost-centers${queryString ? ` | `/api/v1/workspaces/${workspaceId}/cost-centers${queryString ? ` | ✅ WORKING | Verified & Tested |
| cost-allocation | `createCostCenter` | `POST` | `workspaces/${workspaceId}/cost-centers` | `/api/v1/workspaces/${workspaceId}/cost-centers` | ✅ WORKING | Verified & Tested |
| cost-allocation | `updateCostCenter` | `PUT` | `workspaces/${workspaceId}/cost-centers/${costCenterId}` | `/api/v1/workspaces/${workspaceId}/cost-centers/${costCenterId}` | ✅ WORKING | Verified & Tested |
| cost-allocation | `deleteCostCenter` | `DELETE` | `workspaces/${workspaceId}/cost-centers/${costCenterId}` | `/api/v1/workspaces/${workspaceId}/cost-centers/${costCenterId}` | ✅ WORKING | Verified & Tested |
| cost-allocation | `activateCostCenter` | `PATCH` | `workspaces/${workspaceId}/cost-centers/${costCenterId}/activate` | `/api/v1/workspaces/${workspaceId}/cost-centers/${costCenterId}/activate` | ✅ WORKING | Verified & Tested |
| cost-allocation | `listProjects` | `GET` | `workspaces/${workspaceId}/projects${queryString ? ` | `/api/v1/workspaces/${workspaceId}/projects${queryString ? ` | ✅ WORKING | Verified & Tested |
| cost-allocation | `createProject` | `POST` | `workspaces/${workspaceId}/projects` | `/api/v1/workspaces/${workspaceId}/projects` | ✅ WORKING | Verified & Tested |
| cost-allocation | `updateProject` | `PUT` | `workspaces/${workspaceId}/projects/${projectId}` | `/api/v1/workspaces/${workspaceId}/projects/${projectId}` | ✅ WORKING | Verified & Tested |
| cost-allocation | `deleteProject` | `DELETE` | `workspaces/${workspaceId}/projects/${projectId}` | `/api/v1/workspaces/${workspaceId}/projects/${projectId}` | ✅ WORKING | Verified & Tested |
| cost-allocation | `activateProject` | `PATCH` | `workspaces/${workspaceId}/projects/${projectId}/activate` | `/api/v1/workspaces/${workspaceId}/projects/${projectId}/activate` | ✅ WORKING | Verified & Tested |
| cost-allocation | `listExpenseAllocations` | `GET` | `workspaces/${workspaceId}/expenses/${expenseId}/allocations` | `/api/v1/workspaces/${workspaceId}/expenses/${expenseId}/allocations` | ✅ WORKING | Verified & Tested |
| cost-allocation | `allocateExpense` | `POST` | `workspaces/${workspaceId}/expenses/${expenseId}/allocations` | `/api/v1/workspaces/${workspaceId}/expenses/${expenseId}/allocations` | ✅ WORKING | Verified & Tested |
| cost-allocation | `deleteExpenseAllocations` | `DELETE` | `workspaces/${workspaceId}/expenses/${expenseId}/allocations` | `/api/v1/workspaces/${workspaceId}/expenses/${expenseId}/allocations` | ✅ WORKING | Verified & Tested |
| cost-allocation | `getSummary` | `GET` | `workspaces/${workspaceId}/allocations/summary` | `/api/v1/workspaces/${workspaceId}/allocations/summary` | ✅ WORKING | Verified & Tested |
| expense-ledger | `list` | `GET` | `workspaces/${workspaceId}/expenses` | `/api/v1/workspaces/${workspaceId}/expenses` | ✅ WORKING | Verified & Tested |
| expense-ledger | `update` | `PUT` | `workspaces/${workspaceId}/expenses/${expenseId}` | `/api/v1/workspaces/${workspaceId}/expenses/${expenseId}` | ✅ WORKING | Verified & Tested |
| expense-ledger | `delete` | `DELETE` | `workspaces/${workspaceId}/expenses/${expenseId}` | `/api/v1/workspaces/${workspaceId}/expenses/${expenseId}` | ✅ WORKING | Verified & Tested |
| expense-ledger | `submit` | `POST` | `workspaces/${workspaceId}/expenses/${expenseId}/submit` | `/api/v1/workspaces/${workspaceId}/expenses/${expenseId}/submit` | ✅ WORKING | Verified & Tested |
| expense-ledger | `listCategories` | `GET` | `workspaces/${workspaceId}/categories${queryString ? ` | `/api/v1/workspaces/${workspaceId}/categories${queryString ? ` | ✅ WORKING | Verified & Tested |
| expense-ledger | `createCategory` | `POST` | `workspaces/${workspaceId}/categories` | `/api/v1/workspaces/${workspaceId}/categories` | ✅ WORKING | Verified & Tested |
| expense-ledger | `listTags` | `GET` | `workspaces/${workspaceId}/tags${queryString ? ` | `/api/v1/workspaces/${workspaceId}/tags${queryString ? ` | ✅ WORKING | Verified & Tested |
| expense-ledger | `createTag` | `POST` | `workspaces/${workspaceId}/tags` | `/api/v1/workspaces/${workspaceId}/tags` | ✅ WORKING | Verified & Tested |
| expense-ledger | `createSplit` | `POST` | `workspaces/${workspaceId}/expenses/${expenseId}/split` | `/api/v1/workspaces/${workspaceId}/expenses/${expenseId}/split` | ❌ NOT WORKING | Missing integration test validation |
| expense-ledger | `getSplit` | `GET` | `workspaces/${workspaceId}/expenses/${expenseId}/split` | `/api/v1/workspaces/${workspaceId}/expenses/${expenseId}/split` | ❌ NOT WORKING | Missing integration test validation |
| expense-ledger | `listSettlements` | `GET` | `workspaces/${workspaceId}/settlements${queryString ? ` | `/api/v1/workspaces/${workspaceId}/settlements${queryString ? ` | ❌ NOT WORKING | Missing integration test validation |
| expense-ledger | `recordSettlementPayment` | `POST` | `workspaces/${workspaceId}/settlements/${settlementId}/payment` | `/api/v1/workspaces/${workspaceId}/settlements/${settlementId}/payment` | ❌ NOT WORKING | Missing integration test validation |
| expense-ledger | `getStatistics` | `GET` | `workspaces/${workspaceId}/expenses/statistics${queryString ? ` | `/api/v1/workspaces/${workspaceId}/expenses/statistics${queryString ? ` | ✅ WORKING | Verified & Tested |
| identity-workspace | `list` | `GET` | `workspaces` | `/api/v1/workspaces` | ✅ WORKING | Verified & Tested |
| identity-workspace | `create` | `POST` | `workspaces` | `/api/v1/workspaces` | ✅ WORKING | Verified & Tested |
| identity-workspace | `getById` | `GET` | `workspaces/${workspaceId}` | `/api/v1/workspaces/${workspaceId}` | ✅ WORKING | Verified & Tested |
| identity-workspace | `listMembers` | `GET` | `workspaces/${workspaceId}/members` | `/api/v1/workspaces/${workspaceId}/members` | ❌ NOT WORKING | Gateway Route Mismatch |
| identity-workspace | `inviteMember` | `POST` | `workspaces/${workspaceId}/invitations` | `/api/v1/workspaces/${workspaceId}/invitations` | ❌ NOT WORKING | Gateway Route Mismatch |
| identity-workspace | `listInvitations` | `GET` | `workspaces/${workspaceId}/invitations` | `/api/v1/workspaces/${workspaceId}/invitations` | ❌ NOT WORKING | Gateway Route Mismatch |
| identity-workspace | `removeMember` | `DELETE` | `workspaces/${workspaceId}/members/${userId}` | `/api/v1/workspaces/${workspaceId}/members/${userId}` | ❌ NOT WORKING | Gateway Route Mismatch |
| identity-workspace | `updateMemberRole` | `PATCH` | `workspaces/${workspaceId}/members/${userId}/role` | `/api/v1/workspaces/${workspaceId}/members/${userId}/role` | ❌ NOT WORKING | Gateway Route Mismatch |
| identity-workspace | `getInvitationByToken` | `GET` | `invitations/${token}` | `/api/v1/invitations/${token}` | ✅ WORKING | Verified & Tested |
| identity-workspace | `acceptInvitation` | `POST` | `invitations/${token}/accept` | `/api/v1/invitations/${token}/accept` | ✅ WORKING | Verified & Tested |
| inventory-management | `listSuppliers` | `GET` | `workspaces/${workspaceId}/suppliers` | `/api/v1/workspaces/${workspaceId}/suppliers` | ✅ WORKING | Verified & Tested |
| inventory-management | `createSupplier` | `POST` | `workspaces/${workspaceId}/suppliers` | `/api/v1/workspaces/${workspaceId}/suppliers` | ✅ WORKING | Verified & Tested |
| inventory-management | `updateSupplier` | `PUT` | `workspaces/${workspaceId}/suppliers/${supplierId}` | `/api/v1/workspaces/${workspaceId}/suppliers/${supplierId}` | ❌ NOT WORKING | Missing integration test validation |
| inventory-management | `deleteSupplier` | `DELETE` | `workspaces/${workspaceId}/suppliers/${supplierId}` | `/api/v1/workspaces/${workspaceId}/suppliers/${supplierId}` | ❌ NOT WORKING | Missing integration test validation |
| inventory-management | `listLocations` | `GET` | `workspaces/${workspaceId}/locations` | `/api/v1/workspaces/${workspaceId}/locations` | ✅ WORKING | Verified & Tested |
| inventory-management | `createLocation` | `POST` | `workspaces/${workspaceId}/locations` | `/api/v1/workspaces/${workspaceId}/locations` | ✅ WORKING | Verified & Tested |
| inventory-management | `updateLocation` | `PUT` | `workspaces/${workspaceId}/locations/${locationId}` | `/api/v1/workspaces/${workspaceId}/locations/${locationId}` | ❌ NOT WORKING | Missing integration test validation |
| inventory-management | `deleteLocation` | `DELETE` | `workspaces/${workspaceId}/locations/${locationId}` | `/api/v1/workspaces/${workspaceId}/locations/${locationId}` | ❌ NOT WORKING | Missing integration test validation |
| inventory-management | `listStock` | `GET` | `workspaces/${workspaceId}/stocks${queryString ? ` | `/api/v1/workspaces/${workspaceId}/stocks${queryString ? ` | ❌ NOT WORKING | Missing integration test validation |
| inventory-management | `createStockItem` | `POST` | `workspaces/${workspaceId}/stocks` | `/api/v1/workspaces/${workspaceId}/stocks` | ❌ NOT WORKING | Missing integration test validation |
| inventory-management | `updateStockItem` | `PUT` | `workspaces/${workspaceId}/stocks/${stockItemId}` | `/api/v1/workspaces/${workspaceId}/stocks/${stockItemId}` | ❌ NOT WORKING | Missing integration test validation |
| inventory-management | `deleteStockItem` | `DELETE` | `workspaces/${workspaceId}/stocks/${stockItemId}` | `/api/v1/workspaces/${workspaceId}/stocks/${stockItemId}` | ❌ NOT WORKING | Missing integration test validation |
| inventory-management | `listPurchaseOrders` | `GET` | `workspaces/${workspaceId}/purchase-orders` | `/api/v1/workspaces/${workspaceId}/purchase-orders` | ✅ WORKING | Verified & Tested |
| inventory-management | `createPurchaseOrder` | `POST` | `workspaces/${workspaceId}/purchase-orders` | `/api/v1/workspaces/${workspaceId}/purchase-orders` | ✅ WORKING | Verified & Tested |
| inventory-management | `updatePurchaseOrderStatus` | `PUT` | `workspaces/${workspaceId}/purchase-orders/${purchaseOrderId}/status` | `/api/v1/workspaces/${workspaceId}/purchase-orders/${purchaseOrderId}/status` | ❌ NOT WORKING | Missing integration test validation |
| inventory-management | `deletePurchaseOrder` | `DELETE` | `workspaces/${workspaceId}/purchase-orders/${purchaseOrderId}` | `/api/v1/workspaces/${workspaceId}/purchase-orders/${purchaseOrderId}` | ❌ NOT WORKING | Missing integration test validation |
| notification-dispatch | `list` | `GET` | `workspaces/${workspaceId}/notifications${queryString ? ` | `/api/v1/workspaces/${workspaceId}/notifications${queryString ? ` | ✅ WORKING | Verified & Tested |
| notification-dispatch | `listUnread` | `GET` | `workspaces/${workspaceId}/notifications/unread` | `/api/v1/workspaces/${workspaceId}/notifications/unread` | ❌ NOT WORKING | Missing integration test validation |
| notification-dispatch | `markRead` | `PATCH` | `workspaces/${workspaceId}/notifications/${notificationId}/read` | `/api/v1/workspaces/${workspaceId}/notifications/${notificationId}/read` | ✅ WORKING | Verified & Tested |
| notification-dispatch | `markReadAll` | `PATCH` | `workspaces/${workspaceId}/notifications/read-all` | `/api/v1/workspaces/${workspaceId}/notifications/read-all` | ✅ WORKING | Verified & Tested |
| notification-dispatch | `getPreferences` | `GET` | `workspaces/${workspaceId}/notification-preferences` | `/api/v1/workspaces/${workspaceId}/notification-preferences` | ✅ WORKING | Verified & Tested |
| notification-dispatch | `updatePreferences` | `PATCH` | `workspaces/${workspaceId}/notification-preferences` | `/api/v1/workspaces/${workspaceId}/notification-preferences` | ✅ WORKING | Verified & Tested |
| notification-dispatch | `updateTypePreference` | `PATCH` | `workspaces/${workspaceId}/notification-preferences/${type}` | `/api/v1/workspaces/${workspaceId}/notification-preferences/${type}` | ✅ WORKING | Verified & Tested |
| receipt-vault | `list` | `GET` | `workspaces/${workspaceId}/receipts?${queryParams.toString()}` | `/api/v1/workspaces/${workspaceId}/receipts?${queryParams.toString()}` | ✅ WORKING | Verified & Tested |
| receipt-vault | `getById` | `GET` | `workspaces/${workspaceId}/receipts/${receiptId}` | `/api/v1/workspaces/${workspaceId}/receipts/${receiptId}` | ✅ WORKING | Verified & Tested |
| receipt-vault | `registerUploadedReceipt` | `POST` | `workspaces/${workspaceId}/receipts/upload` | `/api/v1/workspaces/${workspaceId}/receipts/upload` | ✅ WORKING | Verified & Tested |
| receipt-vault | `delete` | `DELETE` | `workspaces/${workspaceId}/receipts/${receiptId}` | `/api/v1/workspaces/${workspaceId}/receipts/${receiptId}` | ✅ WORKING | Verified & Tested |
| receipt-vault | `linkExpense` | `POST` | `workspaces/${workspaceId}/receipts/${receiptId}/link-expense` | `/api/v1/workspaces/${workspaceId}/receipts/${receiptId}/link-expense` | ❌ NOT WORKING | Missing integration test validation |
| receipt-vault | `unlinkExpense` | `DELETE` | `workspaces/${workspaceId}/receipts/${receiptId}/unlink-expense` | `/api/v1/workspaces/${workspaceId}/receipts/${receiptId}/unlink-expense` | ❌ NOT WORKING | Missing integration test validation |
| receipt-vault | `processReceipt` | `POST` | `workspaces/${workspaceId}/receipts/${receiptId}/process` | `/api/v1/workspaces/${workspaceId}/receipts/${receiptId}/process` | ✅ WORKING | Verified & Tested |
| receipt-vault | `getMetadata` | `GET` | `workspaces/${workspaceId}/receipts/${receiptId}/metadata` | `/api/v1/workspaces/${workspaceId}/receipts/${receiptId}/metadata` | ✅ WORKING | Verified & Tested |
| receipt-vault | `saveMetadata` | `POST` | `workspaces/${workspaceId}/receipts/${receiptId}/metadata` | `/api/v1/workspaces/${workspaceId}/receipts/${receiptId}/metadata` | ✅ WORKING | Verified & Tested |
| receipt-vault | `updateMetadata` | `PUT` | `workspaces/${workspaceId}/receipts/${receiptId}/metadata` | `/api/v1/workspaces/${workspaceId}/receipts/${receiptId}/metadata` | ✅ WORKING | Verified & Tested |
