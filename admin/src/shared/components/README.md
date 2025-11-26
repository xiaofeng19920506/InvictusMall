# Shared Components

This directory contains reusable components used across the admin application.

## Components

### DataTable
A flexible, generic data table component with support for:
- Custom column definitions
- Empty states
- Loading states
- Row click handlers
- Custom row styling
- Responsive design
- Sticky headers

**Example:**
```tsx
import { DataTable, Column } from "@/shared/components";

const columns: Column<Shipment>[] = [
  {
    key: "trackingNumber",
    header: "Tracking Number",
    render: (row) => <span>{row.trackingNumber}</span>
  }
];

<DataTable
  columns={columns}
  data={shipments}
  getRowKey={(row) => row.id}
  emptyMessage="No shipments found"
/>
```

### EmptyState
A consistent empty state component for when no data is available.

**Example:**
```tsx
<EmptyState
  icon={<Package size={48} />}
  message="No items found"
  action={<button>Add Item</button>}
/>
```

### ActionButtons
A reusable action button group with icon buttons.

**Example:**
```tsx
import { ActionButtons, ActionButton } from "@/shared/components";
import { Eye, Edit2, Trash2 } from "lucide-react";

const actions: ActionButton[] = [
  {
    icon: Eye,
    label: "View",
    onClick: () => handleView(item),
  },
  {
    icon: Edit2,
    label: "Edit",
    onClick: () => handleEdit(item),
  },
  {
    icon: Trash2,
    label: "Delete",
    onClick: () => handleDelete(item),
    variant: "danger",
  },
];

<ActionButtons actions={actions} />
```

### StatusBadge
A consistent status badge component with multiple variants.

**Example:**
```tsx
<StatusBadge
  label="Active"
  variant="success"
  size="md"
/>
```

### SearchFilters
A search and filter component for table filtering.

**Example:**
```tsx
<SearchFilters
  searchQuery={searchQuery}
  onSearchChange={setSearchQuery}
  searchPlaceholder="Search..."
  filters={[
    {
      key: "status",
      label: "Status",
      options: [
        { value: "", label: "All" },
        { value: "active", label: "Active" },
      ],
      value: statusFilter,
      onChange: setStatusFilter,
    },
  ]}
/>
```

### PageHeaderActions
A consistent header action bar for pages.

**Example:**
```tsx
<PageHeaderActions
  primaryAction={{
    icon: <Plus />,
    label: "Create",
    onClick: handleCreate,
    variant: "primary",
  }}
  onRefresh={handleRefresh}
/>
```

### Pagination
A pagination component with page navigation and items per page selector.

## Utilities

### Formatters
Common formatting utilities in `utils/formatters.ts`:
- `formatCurrency(amount, currency)` - Format numbers as currency
- `formatDate(dateString, options)` - Format dates
- `formatDateTime(dateString)` - Format date and time
- `formatFileSize(bytes)` - Format file sizes
- `truncateText(text, maxLength)` - Truncate text with ellipsis

## Usage Guidelines

1. **Always use shared components** when possible to maintain consistency
2. **Extend components** rather than duplicating functionality
3. **Follow TypeScript types** for proper type safety
4. **Use i18n** for all user-facing text
5. **Keep components focused** - each component should have a single responsibility

## Component Features

All components support:
- ✅ Responsive design
- ✅ Accessibility (ARIA labels)
- ✅ Internationalization (i18n)
- ✅ TypeScript type safety
- ✅ Consistent styling via CSS modules

