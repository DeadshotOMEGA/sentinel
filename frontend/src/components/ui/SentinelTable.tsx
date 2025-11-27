/**
 * SentinelTable - react-aria-components Table styled with Sentinel design tokens
 *
 * Provides a v2-like API for tables since HeroUI v3 doesn't include Table component.
 * Uses react-aria-components for accessibility.
 */
import {
  Cell,
  Column,
  Row,
  Table,
  TableBody,
  TableHeader,
  type CellProps,
  type ColumnProps,
  type RowProps,
  type TableProps,
  type TableBodyProps,
  type TableHeaderProps,
} from 'react-aria-components';
import { cn } from '@heroui/react';

const baseStyles = {
  table: 'w-full border-collapse text-sm',
  header: 'border-b border-gray-200',
  column: 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 bg-gray-50',
  body: 'divide-y divide-gray-100',
  row: 'hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
  cell: 'px-4 py-3 text-gray-700',
};

// Table Root
interface SentinelTableProps extends Omit<TableProps, 'className'> {
  'aria-label': string;
  children: React.ReactNode;
  className?: string;
}

function SentinelTable({
  children,
  className,
  ...props
}: SentinelTableProps) {
  return (
    <Table className={cn(baseStyles.table, className)} {...props}>
      {children}
    </Table>
  );
}

// Table Header
interface SentinelTableHeaderProps<T extends object> extends Omit<TableHeaderProps<T>, 'className'> {
  children: React.ReactNode;
  className?: string;
}

function SentinelTableHeader<T extends object>({
  children,
  className,
  ...props
}: SentinelTableHeaderProps<T>) {
  return (
    <TableHeader className={cn(baseStyles.header, className)} {...props}>
      {children}
    </TableHeader>
  );
}

// Table Column
interface SentinelTableColumnProps extends Omit<ColumnProps, 'className'> {
  children: React.ReactNode;
  className?: string;
}

function SentinelTableColumn({
  children,
  className,
  ...props
}: SentinelTableColumnProps) {
  return (
    <Column className={cn(baseStyles.column, className)} {...props}>
      {children}
    </Column>
  );
}

// Table Body
interface SentinelTableBodyProps<T extends object> extends Omit<TableBodyProps<T>, 'className'> {
  children: React.ReactNode;
  emptyContent?: React.ReactNode;
  className?: string;
}

function SentinelTableBody<T extends object>({
  children,
  className,
  emptyContent,
  ...props
}: SentinelTableBodyProps<T>) {
  // Check if children is empty array
  const isEmpty = Array.isArray(children) && children.length === 0;

  return (
    <TableBody className={cn(baseStyles.body, className)} {...props}>
      {isEmpty && emptyContent ? (
        <Row>
          <Cell className="px-4 py-8 text-center text-gray-500">
            {emptyContent}
          </Cell>
        </Row>
      ) : (
        children
      )}
    </TableBody>
  );
}

// Table Row
interface SentinelTableRowProps extends Omit<RowProps<object>, 'className'> {
  children: React.ReactNode;
  className?: string;
}

function SentinelTableRow({
  children,
  className,
  ...props
}: SentinelTableRowProps) {
  return (
    <Row className={cn(baseStyles.row, className)} {...props}>
      {children}
    </Row>
  );
}

// Table Cell
interface SentinelTableCellProps extends Omit<CellProps, 'className'> {
  children: React.ReactNode;
  className?: string;
}

function SentinelTableCell({
  children,
  className,
  ...props
}: SentinelTableCellProps) {
  return (
    <Cell className={cn(baseStyles.cell, className)} {...props}>
      {children}
    </Cell>
  );
}

// Export compound component
export {
  SentinelTable as Table,
  SentinelTableHeader as TableHeader,
  SentinelTableColumn as TableColumn,
  SentinelTableBody as TableBody,
  SentinelTableRow as TableRow,
  SentinelTableCell as TableCell,
};

// Also export with Sentinel prefix for explicit usage
export {
  SentinelTable,
  SentinelTableHeader,
  SentinelTableColumn,
  SentinelTableBody,
  SentinelTableRow,
  SentinelTableCell,
};
