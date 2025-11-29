import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * TablePagination - Reusable pagination component for DataTable
 *
 * Provides navigation controls for paginated data with:
 * - Page info display (showing X-Y of Z items)
 * - Previous/Next buttons
 * - Smart page number display with ellipsis
 * - Optional page size selector
 * - Full keyboard accessibility
 *
 * Follows WCAG AA accessibility guidelines:
 * - Semantic nav element with aria-label
 * - Descriptive button labels
 * - Current page indicated with aria-current
 * - Disabled states properly communicated
 */
import { ChevronLeft, ChevronRight } from '../icons';
export function TablePagination({ currentPage, totalPages, totalItems, pageSize, onPageChange, pageSizeOptions = [10, 25, 50, 100], onPageSizeChange, className = '', }) {
    // Calculate the range of items currently displayed
    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);
    // Generate page numbers with smart ellipsis
    const generatePageNumbers = () => {
        if (totalPages <= 7) {
            // Show all pages if 7 or fewer
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }
        const pages = [];
        // Always show first page
        pages.push(1);
        if (currentPage > 3) {
            pages.push('ellipsis');
        }
        // Show pages around current page
        const start = Math.max(2, currentPage - 1);
        const end = Math.min(totalPages - 1, currentPage + 1);
        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        if (currentPage < totalPages - 2) {
            pages.push('ellipsis');
        }
        // Always show last page
        if (totalPages > 1) {
            pages.push(totalPages);
        }
        return pages;
    };
    const pageNumbers = generatePageNumbers();
    const handlePrevious = () => {
        if (currentPage > 1) {
            onPageChange(currentPage - 1);
        }
    };
    const handleNext = () => {
        if (currentPage < totalPages) {
            onPageChange(currentPage + 1);
        }
    };
    const handlePageClick = (page) => {
        if (page !== currentPage) {
            onPageChange(page);
        }
    };
    const handlePageSizeChange = (e) => {
        const newSize = parseInt(e.target.value, 10);
        if (onPageSizeChange && !isNaN(newSize)) {
            onPageSizeChange(newSize);
        }
    };
    return (_jsxs("nav", { "aria-label": "Pagination", className: `flex items-center justify-between border-t border-gray-200 px-4 py-3 ${className}`, children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsxs("p", { className: "text-sm text-gray-700", children: ["Showing ", _jsx("span", { className: "font-medium", children: startItem }), " to", ' ', _jsx("span", { className: "font-medium", children: endItem }), " of", ' ', _jsx("span", { className: "font-medium", children: totalItems }), " items"] }), onPageSizeChange && (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("label", { htmlFor: "page-size", className: "text-sm text-gray-700", children: "Items per page:" }), _jsx("select", { id: "page-size", value: pageSize, onChange: handlePageSizeChange, className: "\r\n                text-sm border border-gray-300 rounded-md px-2 py-1\r\n                focus:outline-none focus:ring-2 focus:ring-[var(--sentinel-focus-ring)]\r\n                bg-white text-gray-700\r\n              ", children: pageSizeOptions.map((size) => (_jsx("option", { value: size, children: size }, size))) })] }))] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("button", { type: "button", onClick: handlePrevious, disabled: currentPage === 1, "aria-label": "Previous page", "aria-disabled": currentPage === 1, className: `
            inline-flex items-center justify-center w-8 h-8 rounded
            text-gray-700 border border-gray-300
            transition-colors
            ${currentPage === 1
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[var(--sentinel-focus-ring)]'}
          `, children: _jsx(ChevronLeft, { className: "w-4 h-4", "aria-hidden": "true" }) }), _jsx("div", { className: "flex items-center gap-1 mx-2", children: pageNumbers.map((page, index) => {
                            if (page === 'ellipsis') {
                                return (_jsx("span", { className: "inline-flex items-center justify-center w-8 h-8 text-gray-500", "aria-hidden": "true", children: "..." }, `ellipsis-${index}`));
                            }
                            const isCurrent = page === currentPage;
                            return (_jsx("button", { type: "button", onClick: () => handlePageClick(page), "aria-label": isCurrent ? `Current page, page ${page}` : `Go to page ${page}`, "aria-current": isCurrent ? 'page' : undefined, className: `
                  inline-flex items-center justify-center w-8 h-8 rounded
                  text-sm font-medium transition-colors
                  focus:outline-none focus:ring-2 focus:ring-[var(--sentinel-focus-ring)]
                  ${isCurrent
                                    ? 'bg-primary text-white border border-primary'
                                    : 'text-gray-700 border border-gray-300 hover:bg-gray-50'}
                `, children: page }, page));
                        }) }), _jsx("button", { type: "button", onClick: handleNext, disabled: currentPage === totalPages, "aria-label": "Next page", "aria-disabled": currentPage === totalPages, className: `
            inline-flex items-center justify-center w-8 h-8 rounded
            text-gray-700 border border-gray-300
            transition-colors
            ${currentPage === totalPages
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[var(--sentinel-focus-ring)]'}
          `, children: _jsx(ChevronRight, { className: "w-4 h-4", "aria-hidden": "true" }) })] })] }));
}
