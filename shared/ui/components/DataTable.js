import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ChevronUp, ChevronDown } from '../icons';
import { TablePagination } from './Pagination';
export function DataTable({ columns, data, keyExtractor, sortColumn, sortDirection, onSort, onRowClick, loading = false, emptyMessage = 'No data available', className = '', 'aria-label': ariaLabel, pagination, }) {
    const handleSort = (column) => {
        if (!column.sortable || !onSort)
            return;
        const columnKey = String(column.key);
        // Determine next sort direction
        let newDirection = 'asc';
        if (sortColumn === columnKey) {
            if (sortDirection === 'asc') {
                newDirection = 'desc';
            }
            else if (sortDirection === 'desc') {
                newDirection = null;
            }
        }
        onSort(columnKey, newDirection);
    };
    const getSortAriaSort = (column) => {
        if (!column.sortable)
            return 'none';
        if (sortColumn !== String(column.key))
            return 'none';
        if (sortDirection === 'asc')
            return 'ascending';
        if (sortDirection === 'desc')
            return 'descending';
        return 'none';
    };
    const renderCellContent = (column, item, index) => {
        if (column.render) {
            return column.render(item, index);
        }
        const value = item[column.key];
        return value !== null && value !== undefined ? String(value) : '';
    };
    const renderLoadingSkeleton = () => (_jsx("tbody", { children: Array.from({ length: 5 }).map((_, idx) => (_jsx("tr", { className: "border-b border-gray-200", children: columns.map((column, colIndex) => (_jsx("td", { className: `px-4 py-3 ${colIndex === 0 ? 'table-sticky-col' : ''}`, style: { width: column.width }, children: _jsx("div", { className: "h-5 bg-gray-200 rounded animate-pulse" }) }, `skeleton-${idx}-${String(column.key)}`))) }, `skeleton-${idx}`))) }));
    const renderEmptyState = () => (_jsx("tbody", { children: _jsx("tr", { children: _jsx("td", { colSpan: columns.length, className: "px-4 py-8 text-center text-gray-500 text-sm", children: emptyMessage }) }) }));
    const renderData = () => (_jsx("tbody", { children: data.map((item, index) => (_jsx("tr", { onClick: onRowClick ? () => onRowClick(item) : undefined, className: `
            border-b border-gray-200 min-h-[48px]
            table-row-hover
            ${onRowClick ? 'cursor-pointer hover:bg-gray-50' : 'hover:bg-gray-50'}
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--sentinel-focus-ring)]
          `, tabIndex: onRowClick ? 0 : undefined, role: onRowClick ? 'button' : undefined, children: columns.map((column, colIndex) => (_jsx("td", { className: `px-4 py-3 text-sm text-gray-700 ${colIndex === 0 ? 'table-sticky-col' : ''}`, style: { width: column.width }, children: renderCellContent(column, item, index) }, String(column.key)))) }, keyExtractor(item)))) }));
    return (_jsxs("div", { className: className, children: [_jsx("div", { className: "table-responsive-wrapper", children: _jsxs("table", { className: "w-full border-collapse text-sm", "aria-label": ariaLabel, children: [_jsx("thead", { className: "bg-gray-50 border-b border-gray-200", children: _jsx("tr", { children: columns.map((column, index) => (_jsx("th", { scope: "col", "aria-sort": getSortAriaSort(column), className: `
                    px-4 py-3 text-left text-sm font-medium text-gray-500
                    ${column.sortable && onSort ? 'cursor-pointer hover:bg-gray-100 table-header-hover' : ''}
                    ${index === 0 ? 'table-sticky-col' : ''}
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--sentinel-focus-ring)]
                  `, style: { width: column.width }, onClick: () => handleSort(column), onKeyDown: (e) => {
                                        if (column.sortable && onSort && (e.key === 'Enter' || e.key === ' ')) {
                                            e.preventDefault();
                                            handleSort(column);
                                        }
                                    }, tabIndex: column.sortable && onSort ? 0 : undefined, role: column.sortable && onSort ? 'button' : undefined, children: _jsxs("div", { className: "flex items-center", children: [_jsx("span", { children: column.header }), column.sortable && onSort && (_jsxs("span", { className: "ml-1 inline-flex flex-col transition-opacity", children: [sortColumn === String(column.key) && sortDirection === 'asc' && (_jsx(ChevronUp, { className: "w-4 h-4", "aria-hidden": "true" })), sortColumn === String(column.key) && sortDirection === 'desc' && (_jsx(ChevronDown, { className: "w-4 h-4", "aria-hidden": "true" })), (sortColumn !== String(column.key) || sortDirection === null) && (_jsx(ChevronDown, { className: "w-4 h-4 opacity-30", "aria-hidden": "true" }))] }))] }) }, String(column.key)))) }) }), loading ? renderLoadingSkeleton() : data.length === 0 ? renderEmptyState() : renderData()] }) }), pagination && (_jsx(TablePagination, { currentPage: pagination.currentPage, totalPages: pagination.totalPages, totalItems: pagination.totalItems, pageSize: pagination.pageSize, onPageChange: pagination.onPageChange, pageSizeOptions: pagination.pageSizeOptions, onPageSizeChange: pagination.onPageSizeChange }))] }));
}
