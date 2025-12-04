import type { ReactNode } from "react";
import EmptyState from "./EmptyState";
import styles from "./DataTable.module.css";

export interface Column<T = any> {
  key: string;
  header: string | ReactNode;
  accessor?: (row: T) => ReactNode;
  render?: (row: T) => ReactNode;
  width?: string;
  className?: string;
  headerClassName?: string;
  align?: "left" | "center" | "right";
  sticky?: boolean;
}

export interface DataTableProps<T = any> {
  columns: Column<T>[];
  data: T[];
  emptyIcon?: ReactNode;
  emptyMessage?: string;
  emptyAction?: ReactNode;
  getRowKey: (row: T) => string;
  getRowClassName?: (row: T) => string;
  onRowClick?: (row: T) => void;
  className?: string;
  loading?: boolean;
  loadingMessage?: string;
  stickyHeader?: boolean;
}

const DataTable = <T,>({
  columns,
  data,
  emptyIcon,
  emptyMessage,
  emptyAction,
  getRowKey,
  getRowClassName,
  onRowClick,
  className = "",
  loading = false,
  loadingMessage,
  stickyHeader = false,
}: DataTableProps<T>) => {
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>{loadingMessage || "Loading..."}</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon}
        message={emptyMessage || "No data found"}
        action={emptyAction}
      />
    );
  }

  return (
    <div className={`${styles.tableContainer} ${className}`}>
      <table className={styles.table}>
        <thead className={stickyHeader ? styles.stickyHeader : undefined}>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={column.headerClassName}
                style={{
                  width: column.width,
                  textAlign: column.align || "left",
                  position: column.sticky ? "sticky" : undefined,
                  left: column.sticky ? 0 : undefined,
                  zIndex: column.sticky ? 10 : undefined,
                  backgroundColor: column.sticky ? "var(--bg-secondary)" : undefined,
                }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={getRowKey(row)}
              onClick={() => onRowClick?.(row)}
              className={`${
                onRowClick ? styles.clickableRow : ""
              } ${getRowClassName?.(row) || ""}`.trim() || undefined}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={column.className}
                  style={{ textAlign: column.align }}
                >
                  {column.render
                    ? column.render(row)
                    : column.accessor
                    ? column.accessor(row)
                    : null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;

