import { flexRender, Table as TableType } from '@tanstack/react-table';
import { FC } from 'react';

export const Table = <T,>({ table }: { table: TableType<T> }) => {
  return (
    <table className="w-full text-right">
      <thead>
        {table.getHeaderGroups().map((hg, idx, arr) => (
          <tr key={hg.id}>
            {hg.headers.map((h, idx, arr) => {
              const leftCornerClassName = idx === 0 ? 'rounded-tl-lg' : '';
              const rightCornerClassName =
                idx === arr.length - 1 ? 'rounded-tr-lg' : '';
              return (
                <th
                  key={h.id}
                  className={`bg-red-400 ${leftCornerClassName}${rightCornerClassName} pr-1`}
                >
                  {flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              );
            })}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((r, ridx, rarr) => (
          <tr key={r.id}>
            {r.getVisibleCells().map((c, cidx, carr) => {
              const leftBottomCornerClassName =
                ridx === rarr.length - 1 && cidx === 0 ? 'rounded-bl-lg' : '';
              const rightBottomCornerClassName =
                ridx === rarr.length - 1 && cidx === carr.length - 1
                  ? 'rounded-br-lg'
                  : '';
              return (
                <td
                  key={c.id}
                  className={`${leftBottomCornerClassName}${rightBottomCornerClassName} ${
                    ridx % 2 === 1 ? 'bg-primary-100' : 'bg-primary-50'
                  } pr-1`}
                >
                  {flexRender(c.column.columnDef.cell, c.getContext())}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
};
