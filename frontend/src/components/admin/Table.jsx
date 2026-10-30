import { ChevronLeft, ChevronRight } from "lucide-react";

export function DataTable({
  columns,
  rows = [],
  rowKey = (row) => row.id,
  loading = false,
  empty = "Nothing to show yet.",
  onRowClick,
}) {
  return (
    <div className="admin-table-wrap admin-table-wrap--stack">
      <table className="admin-table admin-table--stack">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key || column.header} className={column.className || ""} scope="col">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading &&
            Array.from({ length: 6 }).map((_, index) => (
              <tr key={`skeleton-${index}`} className="is-skeleton">
                {columns.map((column) => (
                  <td
                    key={column.key || column.header}
                    className={column.className || ""}
                    data-label={column.header || undefined}
                  >
                    <span className="skeleton skeleton--row" />
                  </td>
                ))}
              </tr>
            ))}
          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="admin-table__empty">
                {empty}
              </td>
            </tr>
          )}
          {!loading &&
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                className={onRowClick ? "is-clickable" : ""}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={
                  onRowClick
                    ? (event) => {
                        if (event.key === "Enter") onRowClick(row);
                      }
                    : undefined
                }
              >
                {columns.map((column) => (
                  <td
                    key={column.key || column.header}
                    className={column.className || ""}
                    data-label={column.header || undefined}
                  >
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({ page, pages, total, pageSize, onPageChange }) {
  if (!total) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const windowStart = Math.max(1, Math.min(page - 2, pages - 4));
  const windowEnd = Math.min(pages, windowStart + 4);
  const numbers = [];
  for (let number = windowStart; number <= windowEnd; number += 1) numbers.push(number);

  return (
    <div className="admin-pagination">
      <span className="admin-pagination__meta">
        {start}–{end} of {total}
      </span>
      <div className="admin-pagination__controls">
        <button
          type="button"
          className="btn-icon admin-pagination__arrow"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
        {numbers.map((number) => (
          <button
            key={number}
            type="button"
            className={`admin-pagination__page${number === page ? " is-active" : ""}`}
            onClick={() => onPageChange(number)}
            aria-current={number === page ? "page" : undefined}
          >
            {number}
          </button>
        ))}
        <button
          type="button"
          className="btn-icon admin-pagination__arrow"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pages}
          aria-label="Next page"
        >
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
