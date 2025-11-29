/**
 * DataTable Usage Example
 *
 * Demonstrates how to use the DataTable component with sorting, pagination, and custom rendering.
 */
import { useState } from 'react';
import { DataTable, type Column, type SortDirection } from './DataTable';
import { Badge } from './Badge';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
  status: 'active' | 'inactive';
  lastLogin: string;
}

const mockUsers: User[] = [
  { id: 1, name: 'John Doe', email: 'john@sentinel.mil', role: 'admin', status: 'active', lastLogin: '2024-01-15T10:30:00Z' },
  { id: 2, name: 'Jane Smith', email: 'jane@sentinel.mil', role: 'user', status: 'active', lastLogin: '2024-01-14T15:45:00Z' },
  { id: 3, name: 'Bob Johnson', email: 'bob@sentinel.mil', role: 'viewer', status: 'inactive', lastLogin: '2023-12-20T09:00:00Z' },
];

export function DataTableExample() {
  const [sortColumn, setSortColumn] = useState<string | undefined>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [loading] = useState(false); // Could be controlled by refresh button
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      width: '200px',
    },
    {
      key: 'email',
      header: 'Email',
      sortable: true,
      width: '250px',
    },
    {
      key: 'role',
      header: 'Role',
      sortable: true,
      width: '120px',
      render: (user) => (
        <Badge variant={user.role === 'admin' ? 'success' : 'neutral'}>
          {user.role}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      width: '120px',
      render: (user) => (
        <Badge variant={user.status === 'active' ? 'success' : 'neutral'}>
          {user.status}
        </Badge>
      ),
    },
    {
      key: 'lastLogin',
      header: 'Last Login',
      sortable: true,
      render: (user) => new Date(user.lastLogin).toLocaleDateString(),
    },
  ];

  const handleSort = (column: string, direction: SortDirection) => {
    setSortColumn(column);
    setSortDirection(direction);

    // In a real app, you would trigger a data fetch here
    // with the new sort parameters
  };

  const handleRowClick = (user: User) => {
    console.log('Clicked user:', user);
    // Navigate to user detail page or show modal
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // In a real app, trigger data fetch with new page
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when changing page size
    // In a real app, trigger data fetch with new page size
  };

  // Apply client-side sorting for demo purposes
  const sortedUsers = [...mockUsers].sort((a, b) => {
    if (!sortColumn || !sortDirection) return 0;

    const aValue = a[sortColumn as keyof User];
    const bValue = b[sortColumn as keyof User];

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Calculate pagination values
  const totalItems = sortedUsers.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedUsers = sortedUsers.slice(startIndex, startIndex + pageSize);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Users</h2>

      <DataTable
        columns={columns}
        data={paginatedUsers}
        keyExtractor={(user) => user.id}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSort={handleSort}
        onRowClick={handleRowClick}
        loading={loading}
        emptyMessage="No users found"
        aria-label="Users table"
        pagination={{
          currentPage,
          totalPages,
          totalItems,
          pageSize,
          onPageChange: handlePageChange,
          pageSizeOptions: [5, 10, 25, 50],
          onPageSizeChange: handlePageSizeChange,
        }}
      />
    </div>
  );
}
