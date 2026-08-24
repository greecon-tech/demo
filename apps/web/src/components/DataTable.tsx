import { ReactNode } from "react";

export interface Column<Row extends object> {
  key: keyof Row;
  label: string;
  render?: (row: Row) => ReactNode;
}

export function DataTable<Row extends object>({
  columns,
  rows,
  emptyLabel = "No records available"
}: {
  columns: readonly Column<Row>[];
  rows: readonly Row[];
  emptyLabel?: string;
}) {
  if (rows.length === 0) {
    return <div className="empty-state">{emptyLabel}</div>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={String(column.key)}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {columns.map((column) => (
                <td key={String(column.key)}>{column.render ? column.render(row) : String(row[column.key] ?? "")}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
