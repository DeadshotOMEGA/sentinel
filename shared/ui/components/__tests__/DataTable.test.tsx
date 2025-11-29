/**
 * DataTable component tests
 *
 * Tests for the reusable sortable table component.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTable, type Column } from '../DataTable';

interface TestData {
  id: number;
  name: string;
  email: string;
  status: 'active' | 'inactive';
}

const mockData: TestData[] = [
  { id: 1, name: 'John Doe', email: 'john@example.com', status: 'active' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'inactive' },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', status: 'active' },
];

const columns: Column<TestData>[] = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'email', header: 'Email', sortable: true },
  { key: 'status', header: 'Status', sortable: false },
];

describe('DataTable', () => {
  it('renders table with data', () => {
    render(
      <DataTable
        columns={columns}
        data={mockData}
        keyExtractor={(item) => item.id}
        aria-label="Test table"
      />
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
  });

  it('renders empty state when no data', () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        keyExtractor={(item) => item.id}
        emptyMessage="No users found"
        aria-label="Test table"
      />
    );

    expect(screen.getByText('No users found')).toBeInTheDocument();
  });

  it('renders loading skeleton when loading', () => {
    const { container } = render(
      <DataTable
        columns={columns}
        data={[]}
        keyExtractor={(item) => item.id}
        loading={true}
        aria-label="Test table"
      />
    );

    // Check for skeleton rows
    const skeletonDivs = container.querySelectorAll('.animate-pulse');
    expect(skeletonDivs.length).toBeGreaterThan(0);
  });

  it('calls onSort when sortable column is clicked', () => {
    const onSort = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={mockData}
        keyExtractor={(item) => item.id}
        onSort={onSort}
        aria-label="Test table"
      />
    );

    const nameHeader = screen.getByText('Name').closest('th');
    fireEvent.click(nameHeader!);

    expect(onSort).toHaveBeenCalledWith('name', 'asc');
  });

  it('toggles sort direction on repeated clicks', () => {
    const onSort = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={mockData}
        keyExtractor={(item) => item.id}
        sortColumn="name"
        sortDirection="asc"
        onSort={onSort}
        aria-label="Test table"
      />
    );

    const nameHeader = screen.getByText('Name').closest('th');

    // First click should change to desc
    fireEvent.click(nameHeader!);
    expect(onSort).toHaveBeenCalledWith('name', 'desc');
  });

  it('calls onRowClick when row is clicked', () => {
    const onRowClick = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={mockData}
        keyExtractor={(item) => item.id}
        onRowClick={onRowClick}
        aria-label="Test table"
      />
    );

    const firstRow = screen.getByText('John Doe').closest('tr');
    fireEvent.click(firstRow!);

    expect(onRowClick).toHaveBeenCalledWith(mockData[0]);
  });

  it('renders custom cell content', () => {
    const customColumns: Column<TestData>[] = [
      {
        key: 'name',
        header: 'Name',
        render: (item) => <strong>{item.name.toUpperCase()}</strong>
      },
    ];

    render(
      <DataTable
        columns={customColumns}
        data={mockData}
        keyExtractor={(item) => item.id}
        aria-label="Test table"
      />
    );

    expect(screen.getByText('JOHN DOE')).toBeInTheDocument();
  });

  it('sets proper ARIA attributes for sorting', () => {
    render(
      <DataTable
        columns={columns}
        data={mockData}
        keyExtractor={(item) => item.id}
        sortColumn="name"
        sortDirection="asc"
        onSort={vi.fn()}
        aria-label="Test table"
      />
    );

    const nameHeader = screen.getByText('Name').closest('th');
    expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');
  });

  it('supports keyboard navigation for sortable headers', () => {
    const onSort = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={mockData}
        keyExtractor={(item) => item.id}
        onSort={onSort}
        aria-label="Test table"
      />
    );

    const nameHeader = screen.getByText('Name').closest('th');

    // Test Enter key
    fireEvent.keyDown(nameHeader!, { key: 'Enter' });
    expect(onSort).toHaveBeenCalledWith('name', 'asc');

    // Test Space key
    fireEvent.keyDown(nameHeader!, { key: ' ' });
    expect(onSort).toHaveBeenCalledTimes(2);
  });

  it('applies responsive wrapper class for mobile scrolling', () => {
    const { container } = render(
      <DataTable
        columns={columns}
        data={mockData}
        keyExtractor={(item) => item.id}
        aria-label="Test table"
      />
    );

    const wrapper = container.querySelector('.table-responsive-wrapper');
    expect(wrapper).toBeInTheDocument();
  });

  it('applies sticky column class to first column cells', () => {
    const { container } = render(
      <DataTable
        columns={columns}
        data={mockData}
        keyExtractor={(item) => item.id}
        aria-label="Test table"
      />
    );

    // Check header first column
    const firstHeaderCell = container.querySelector('thead th:first-child');
    expect(firstHeaderCell).toHaveClass('table-sticky-col');

    // Check body first column
    const firstBodyCells = container.querySelectorAll('tbody tr td:first-child');
    firstBodyCells.forEach(cell => {
      expect(cell).toHaveClass('table-sticky-col');
    });
  });

  describe('Pagination', () => {
    it('renders pagination controls when pagination prop is provided', () => {
      const onPageChange = vi.fn();
      render(
        <DataTable
          columns={columns}
          data={mockData}
          keyExtractor={(item) => item.id}
          aria-label="Test table"
          pagination={{
            currentPage: 1,
            totalPages: 5,
            totalItems: 50,
            pageSize: 10,
            onPageChange,
          }}
        />
      );

      expect(screen.getByText(/Showing 1 to 10 of 50 items/i)).toBeInTheDocument();
      expect(screen.getByLabelText('Previous page')).toBeInTheDocument();
      expect(screen.getByLabelText('Next page')).toBeInTheDocument();
    });

    it('does not render pagination when pagination prop is not provided', () => {
      render(
        <DataTable
          columns={columns}
          data={mockData}
          keyExtractor={(item) => item.id}
          aria-label="Test table"
        />
      );

      expect(screen.queryByLabelText('Previous page')).not.toBeInTheDocument();
    });

    it('calls onPageChange when next button is clicked', () => {
      const onPageChange = vi.fn();
      render(
        <DataTable
          columns={columns}
          data={mockData}
          keyExtractor={(item) => item.id}
          aria-label="Test table"
          pagination={{
            currentPage: 1,
            totalPages: 5,
            totalItems: 50,
            pageSize: 10,
            onPageChange,
          }}
        />
      );

      const nextButton = screen.getByLabelText('Next page');
      fireEvent.click(nextButton);

      expect(onPageChange).toHaveBeenCalledWith(2);
    });

    it('calls onPageChange when previous button is clicked', () => {
      const onPageChange = vi.fn();
      render(
        <DataTable
          columns={columns}
          data={mockData}
          keyExtractor={(item) => item.id}
          aria-label="Test table"
          pagination={{
            currentPage: 2,
            totalPages: 5,
            totalItems: 50,
            pageSize: 10,
            onPageChange,
          }}
        />
      );

      const prevButton = screen.getByLabelText('Previous page');
      fireEvent.click(prevButton);

      expect(onPageChange).toHaveBeenCalledWith(1);
    });

    it('disables previous button on first page', () => {
      render(
        <DataTable
          columns={columns}
          data={mockData}
          keyExtractor={(item) => item.id}
          aria-label="Test table"
          pagination={{
            currentPage: 1,
            totalPages: 5,
            totalItems: 50,
            pageSize: 10,
            onPageChange: vi.fn(),
          }}
        />
      );

      const prevButton = screen.getByLabelText('Previous page');
      expect(prevButton).toBeDisabled();
    });

    it('disables next button on last page', () => {
      render(
        <DataTable
          columns={columns}
          data={mockData}
          keyExtractor={(item) => item.id}
          aria-label="Test table"
          pagination={{
            currentPage: 5,
            totalPages: 5,
            totalItems: 50,
            pageSize: 10,
            onPageChange: vi.fn(),
          }}
        />
      );

      const nextButton = screen.getByLabelText('Next page');
      expect(nextButton).toBeDisabled();
    });

    it('renders page size selector when onPageSizeChange is provided', () => {
      const onPageSizeChange = vi.fn();
      render(
        <DataTable
          columns={columns}
          data={mockData}
          keyExtractor={(item) => item.id}
          aria-label="Test table"
          pagination={{
            currentPage: 1,
            totalPages: 5,
            totalItems: 50,
            pageSize: 10,
            onPageChange: vi.fn(),
            pageSizeOptions: [10, 25, 50],
            onPageSizeChange,
          }}
        />
      );

      expect(screen.getByLabelText('Items per page:')).toBeInTheDocument();
    });

    it('calls onPageSizeChange when page size is changed', () => {
      const onPageSizeChange = vi.fn();
      render(
        <DataTable
          columns={columns}
          data={mockData}
          keyExtractor={(item) => item.id}
          aria-label="Test table"
          pagination={{
            currentPage: 1,
            totalPages: 5,
            totalItems: 50,
            pageSize: 10,
            onPageChange: vi.fn(),
            pageSizeOptions: [10, 25, 50],
            onPageSizeChange,
          }}
        />
      );

      const pageSizeSelect = screen.getByLabelText('Items per page:');
      fireEvent.change(pageSizeSelect, { target: { value: '25' } });

      expect(onPageSizeChange).toHaveBeenCalledWith(25);
    });
  });
});
