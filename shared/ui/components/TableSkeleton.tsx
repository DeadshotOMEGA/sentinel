import { Skeleton } from './Skeleton';

/**
 * TableSkeleton component for loading states in data tables
 *
 * Renders a skeleton table with proper structure (thead + tbody).
 * Configurable number of rows and columns.
 *
 * @example
 * ```tsx
 * // Standard table skeleton
 * <TableSkeleton rows={5} columns={4} />
 *
 * // While loading data
 * {isLoading ? (
 *   <TableSkeleton rows={10} columns={6} />
 * ) : (
 *   <Table>...</Table>
 * )}
 * ```
 */

interface TableSkeletonProps {
  /** Number of body rows to render */
  rows?: number;
  /** Number of columns */
  columns?: number;
  /** Additional CSS classes for container */
  className?: string;
}

export function TableSkeleton({
  rows = 5,
  columns = 4,
  className = '',
}: TableSkeletonProps) {
  if (rows < 1) {
    throw new Error('TableSkeleton rows must be at least 1');
  }
  if (columns < 1) {
    throw new Error('TableSkeleton columns must be at least 1');
  }

  return (
    <div
      role="status"
      aria-label="Loading table data"
      className={`w-full ${className}`}
    >
      <table className="w-full border-collapse">
        {/* Header row */}
        <thead>
          <tr className="border-b border-neutral-200">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <th
                key={`header-${colIndex}`}
                className="px-4 py-3 text-left"
              >
                <Skeleton
                  height="20px"
                  width={colIndex === 0 ? '120px' : '80px'}
                />
              </th>
            ))}
          </tr>
        </thead>

        {/* Body rows */}
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr
              key={`row-${rowIndex}`}
              className="border-b border-neutral-100"
            >
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td
                  key={`cell-${rowIndex}-${colIndex}`}
                  className="px-4 py-3"
                >
                  <Skeleton
                    height="16px"
                    width={
                      colIndex === 0
                        ? '100px'
                        : colIndex === columns - 1
                          ? '60px'
                          : '80px'
                    }
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <span className="sr-only">Loading table data</span>
    </div>
  );
}
