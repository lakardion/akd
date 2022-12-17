import {
  ColumnDef,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Spinner } from 'components/spinner';
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
  const { data: debtors, isLoading } = trpc.analytics.debtors.useQuery();

  const debtorRows = useMemo(() => {
    return (
      debtors?.map((d) => ({
        fullName: `${d.name} ${d.lastName}`,
        totalDebt: d.debts?.amount ?? 0,
        link: `/alumnos/${d.id}`,
      })) ?? []
    );
  }, [debtors]);

  const table = useReactTable({
    columns: columnDefs,
    data: debtorRows,
    getCoreRowModel: getCoreRowModel(),
  });
  if (isLoading) {
    return (
      <section className="flex h-full w-full items-center justify-center">
        <Spinner size="sm" />
      </section>
    );
  }
  if (!debtors?.length) {
    return (
      <section className="flex w-full justify-center">
        <p className="italic">Enhorabuena! No tenés deudores!!</p>
      </section>
    );
  }
  return <Table table={table} />;
};
