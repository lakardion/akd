import {
  ColumnDef,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Table } from 'components/table';
import Link from 'next/link';
import { useMemo } from 'react';
import { trpc } from 'utils/trpc';

const columnDefs: ColumnDef<{
  fullName: string;
  totalDebt: number;
  link: string;
}>[] = [
  {
    id: 'fullName',
    header: 'Nombre',
    accessorKey: 'fullName',

    cell: ({ row }) => {
      return (
        <Link href={row.original.link}>
          <p className="text-blue-500 underline  visited:text-purple-400">
            {row.original.fullName}
          </p>
        </Link>
      );
    },
  },
  {
    id: 'totalDebt',
    header: 'Deuda',
    accessorFn: (row) => `$ ${row.totalDebt}`,
  },
];

export const DebtorsCard = () => {
  const { data: debtors } = trpc.analytics.debtors.useQuery();

  const debtorRows = useMemo(() => {
    return (
      debtors?.map((d) => ({
        fullName: `${d.name} ${d.lastName}`,
        totalDebt: d.debts?.amount ?? 0,
        link: `/alumnos/${d.id}`,
      })) ?? []
    );
  }, [debtors]);

  console.log(JSON.stringify({ debtorRows }, undefined, 2));

  const table = useReactTable({
    columns: columnDefs,
    data: debtorRows,
    getCoreRowModel: getCoreRowModel(),
  });
  return <Table table={table} />;
};
