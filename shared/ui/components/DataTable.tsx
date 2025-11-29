/**
 * DataTable - Reusable sortable table component
 *
 * Generic table component with built-in sorting, loading states, pagination, and accessibility.
 * Uses Sentinel design tokens for consistent styling.
 */
import { ReactNode } from 'react';
import { ChevronUp, ChevronDown } from '../icons';
import { TablePagination } from './Pagination';

export type SortDirection = 'asc' | 'desc' | null;

export interface Column<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  width?: string;
  render?: (item: T, index: number) => ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string | number;
  sortColumn?: string;
  sortDirection?: SortDirection;
  onSort?: (column: string, direction: SortDirection) => void;
  onRowClick?: (item: T) => void;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  'aria-label': string;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    pageSizeOptions?: number[];
    onPageSizeChange?: (size: number) => void;
  };
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  sortColumn,
  sortDirection,
  onSort,
  onRowClick,
  loading = false,
  emptyMessage = 'No data available',
  className = '',
  'aria-label': ariaLabel,
  pagination,
}: DataTableProps<T>) {
  const handleSort = (column: Column<T>) => {
    if (!column.sortable || !onSort) return;

    const columnKey = String(column.key);

    // Determine next sort direction
    let newDirection: SortDirection = 'asc';
    if (sortColumn === columnKey) {
      if (sortDirection === 'asc') {
        newDirection = 'desc';
      } else if (sortDirection === 'desc') {
        newDirection = null;
      }
    }

    onSort(columnKey, newDirection);
  };

  const getSortAriaSort = (column: Column<T>): 'ascending' | 'descending' | 'none' => {
    if (!column.sortable) return 'none';
    if (sortColumn !== String(column.key)) return 'none';
    if (sortDirection === 'asc') return 'ascending';
    if (sortDirection === 'desc') return 'descending';
    return 'none';
  };

  const renderCellContent = (column: Column<T>, item: T, index: number): ReactNode => {
    if (column.render) {
      return column.render(item, index);
    }
    const value = item[column.key as keyof T];
    return value !== null && value !== undefined ? String(value) : '';
  };

  const renderLoadingSkeleton = () => (
    <tbody>
      {Array.from({ length: 5 }).map((_, idx) => (
        <tr key={`skeleton-${idx}`} className="border-b border-gray-200">
          {columns.map((column, colIndex) => (
            <td
              key={`skeleton-${idx}-${String(column.key)}`}
              className={`px-4 py-3 ${colIndex === 0 ? 'table-sticky-col' : ''}`}
              style={{ width: column.width }}
            >
              <div className="h-5 bg-gray-200 rounded animate-pulse" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );

  const renderEmptyState = () => (
    <tbody>
      <tr>
        <td
          colSpan={columns.length}
          className="px-4 py-8 text-center text-gray-500 text-sm"
        >
          {emptyMessage}
        </td>
      </tr>
    </tbody>
  );

  const renderData = () => (
    <tbody>
      {data.map((item, index) => (
        <tr
          key={keyExtractor(item)}
          onClick={onRowClick ? () => onRowClick(item) : undefined}
          className={`
            border-b border-gray-200 min-h-[48px]
            table-row-hover
            ${onRowClick ? 'cursor-pointer hover:bg-gray-50' : 'hover:bg-gray-50'}
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--sentinel-focus-ring)]
          `}
          tabIndex={onRowClick ? 0 : undefined}
          role={onRowClick ? 'button' : undefined}
        >
          {columns.map((column, colIndex) => (
            <td
              key={String(column.key)}
              className={`px-4 py-3 text-sm text-gray-700 ${colIndex === 0 ? 'table-sticky-col' : ''}`}
              style={{ width: column.width }}
            >
              {renderCellContent(column, item, index)}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );

  return (
    <div className={className}>
      <div className="table-responsive-wrapper">
        <table
          className="w-full border-collapse text-sm"
          aria-label={ariaLabel}
        >
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={String(column.key)}
                  scope="col"
                  aria-sort={getSortAriaSort(column)}
                  className={`
                    px-4 py-3 text-left text-sm font-medium text-gray-500
                    ${column.sortable && onSort ? 'cursor-pointer hover:bg-gray-100 table-header-hover' : ''}
                    ${index === 0 ? 'table-sticky-col' : ''}
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--sentinel-focus-ring)]
                  `}
                  style={{ width: column.width }}
                  onClick={() => handleSort(column)}
                  onKeyDown={(e) => {
                    if (column.sortable && onSort && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      handleSort(column);
                    }
                  }}
                  tabIndex={column.sortable && onSort ? 0 : undefined}
                  role={column.sortable && onSort ? 'button' : undefined}
                >
                  <div className="flex items-center">
                    <span>{column.header}</span>
                    {column.sortable && onSort && (
                      <span className="ml-1 inline-flex flex-col transition-opacity">
                        {sortColumn === String(column.key) && sortDirection === 'asc' && (
                          <ChevronUp className="w-4 h-4" aria-hidden="true" />
                        )}
                        {sortColumn === String(column.key) && sortDirection === 'desc' && (
                          <ChevronDown className="w-4 h-4" aria-hidden="true" />
                        )}
                        {(sortColumn !== String(column.key) || sortDirection === null) && (
                          <ChevronDown className="w-4 h-4 opacity-30" aria-hidden="true" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          {loading ? renderLoadingSkeleton() : data.length === 0 ? renderEmptyState() : renderData()}
        </table>
      </div>
      {pagination && (
        <TablePagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          pageSize={pagination.pageSize}
          onPageChange={pagination.onPageChange}
          pageSizeOptions={pagination.pageSizeOptions}
          onPageSizeChange={pagination.onPageSizeChange}
        />
      )}
    </div>
  );
}
