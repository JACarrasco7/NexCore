'use client'

import React from 'react'

interface Column<T> {
  key: keyof T
  label: string
  render?: (value: any, item: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T extends Record<string, any>> {
  columns: Column<T>[]
  data: T[]
  onRowClick?: (item: T) => void
  emptyText?: string
  striped?: boolean
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  onRowClick,
  emptyText = 'Sin datos',
  striped = true,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="border-line bg-surface flex items-center justify-center rounded-2xl border border-dashed py-12">
        <p className="text-foreground/40 text-sm">{emptyText}</p>
      </div>
    )
  }

  return (
    <div className="border-line bg-surface overflow-x-auto rounded-2xl border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-line/50 bg-surface-strong/30 border-b">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={`text-foreground/60 px-4 py-3 text-left font-semibold ${col.className ?? ''}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, idx) => (
            <tr
              key={idx}
              onClick={() => onRowClick?.(item)}
              className={`border-line/40 border-b transition ${
                onRowClick ? 'hover:bg-surface-strong/50 cursor-pointer' : ''
              } ${striped && idx % 2 === 1 ? 'bg-surface-strong/20' : ''}`}
            >
              {columns.map((col) => (
                <td
                  key={String(col.key)}
                  className={`text-foreground/80 px-4 py-3 ${col.className ?? ''}`}
                >
                  {col.render ? col.render(item[col.key], item) : item[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
