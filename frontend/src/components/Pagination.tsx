import React, { useState } from 'react';
import { usePaginationShortcuts } from '../hooks/usePaginationShortcuts';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage?: number;
  totalItems?: number;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  allowCustomPageSize?: boolean;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage = 20,
  totalItems,
  onItemsPerPageChange,
  allowCustomPageSize = true,
}: PaginationProps) {
  const [pageSize, setPageSize] = useState(itemsPerPage);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    if (onItemsPerPageChange) {
      onItemsPerPageChange(newSize);
      // Reset to first page when changing page size
      onPageChange(1);
    }
  };
  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleFirst = () => {
    onPageChange(1);
  };

  const handleLast = () => {
    onPageChange(totalPages);
  };

  // Use keyboard shortcuts
  usePaginationShortcuts({
    currentPage,
    totalPages,
    onNext: handleNext,
    onPrevious: handlePrevious,
    onFirst: handleFirst,
    onLast: handleLast,
  });

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems || 0);

  return (
    <div style={styles.container}>
      <div style={styles.info}>
        {totalItems && (
          <span>
            Showing {startItem}-{endItem} of {totalItems} items
          </span>
        )}
        <span style={styles.pageInfo}>
          Page {currentPage} of {totalPages}
        </span>
      </div>

      <div style={styles.controls}>
        {/* First Page Button */}
        <button
          onClick={handleFirst}
          disabled={currentPage === 1}
          style={{
            ...styles.button,
            opacity: currentPage === 1 ? 0.5 : 1,
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
          }}
          title="First page (Alt+F or Home)"
        >
          ⏮️ First
        </button>

        {/* Previous Button */}
        <button
          onClick={handlePrevious}
          disabled={currentPage === 1}
          style={{
            ...styles.button,
            opacity: currentPage === 1 ? 0.5 : 1,
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
          }}
          title="Previous page (Alt+P or ←)"
        >
          ◀ Prev
        </button>

        {/* Next Button */}
        <button
          onClick={handleNext}
          disabled={currentPage >= totalPages}
          style={{
            ...styles.button,
            opacity: currentPage >= totalPages ? 0.5 : 1,
            cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
          }}
          title="Next page (Alt+N or →)"
        >
          Next ▶
        </button>

        {/* Last Page Button */}
        <button
          onClick={handleLast}
          disabled={currentPage === totalPages}
          style={{
            ...styles.button,
            opacity: currentPage === totalPages ? 0.5 : 1,
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
          }}
          title="Last page (Alt+L or End)"
        >
          Last ⏭️
        </button>
      </div>

      {/* Results Per Page Selector */}
      {allowCustomPageSize && (
        <div style={styles.pageSizeControl}>
          <label style={styles.pageSizeLabel}>📊 Show per page:</label>
          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
            style={styles.pageSizeSelect}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size} items
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Shortcuts Legend */}
      <div style={styles.shortcuts}>
        <span style={styles.shortcutLabel}>⌨️ Shortcuts:</span>
        <span style={styles.shortcutItem}>Alt+F / Home = First</span>
        <span style={styles.shortcutItem}>Alt+P / ← = Previous</span>
        <span style={styles.shortcutItem}>Alt+N / → = Next</span>
        <span style={styles.shortcutItem}>Alt+L / End = Last</span>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    borderTop: '1px solid #eee',
    backgroundColor: '#f9f9f9',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  info: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '14px',
    color: '#666',
  },
  pageInfo: {
    fontWeight: 600 as const,
    color: '#333',
  },
  controls: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'center',
  },
  button: {
    padding: '8px 14px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500 as const,
    transition: 'all 0.2s',
  },
  shortcuts: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap' as const,
    fontSize: '12px',
    color: '#888',
    padding: '8px 0',
    borderTop: '1px solid #eee',
    justifyContent: 'center',
  },
  shortcutLabel: {
    fontWeight: 600 as const,
    color: '#666',
  },
  shortcutItem: {
    padding: '2px 6px',
    backgroundColor: '#e8e8e8',
    borderRadius: '3px',
    fontFamily: 'monospace',
  },
  pageSizeControl: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    justifyContent: 'center',
    padding: '8px 0',
    borderTop: '1px solid #eee',
  },
  pageSizeLabel: {
    fontSize: '13px',
    fontWeight: 500 as const,
    color: '#555',
  },
  pageSizeSelect: {
    padding: '6px 10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    backgroundColor: '#fff',
    fontSize: '13px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s',
  },
};
