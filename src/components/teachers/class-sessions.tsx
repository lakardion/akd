import {
  ColumnDef,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { PaginationControls } from 'components/pagination-controls';
import { Spinner } from 'components/spinner';
import { Table } from 'components/table';
import { format } from 'date-fns';
import { FC, useMemo, useState } from 'react';
import { usePaginationHandlers } from 'utils/pagination';
import { trpc } from 'utils/trpc';

type ClassSessionRow = {
  date: Date;
  teacher: {
    name: string | undefined;
    lastName: string | undefined;
  };
  hours: number;
  studentCount: number;
};
const defaultColumns: ColumnDef<ClassSessionRow>[] = [
  {
    id: 'date',
    header: 'Día',
    accessorFn: (vals) => format(vals.date, 'dd-MM-yyyy'),
  },
  {
    id: 'teacher',
    header: 'Profesor',
    accessorFn: (vals) => `${vals.teacher.name} ${vals.teacher.lastName}`,
  },
  {
    id: 'hours',
    accessorKey: 'hours',
    header: 'Horas',
  },
  {
    id: 'studentCount',
    accessorFn: (vals) => `${vals.studentCount}`,
    header: 'Alumnos',
  },
];

export const ClassSessionTable: FC<{ teacherId: string }> = ({ teacherId }) => {
  const [page, setPage] = useState(1);
  const { data, isFetching, isLoading, isPreviousData } = trpc.useQuery([
    'classSessions.paginated',
    { page, teacherId },
  ]);

  const { goFirstPage, goLastPage, goNextPage, goPreviousPage } =
    usePaginationHandlers(
      useMemo(
        () => ({
          nextPage: data?.nextPage,
          previousPage: data?.previousPage,
          setPage,
          totalPages: data?.totalPages ?? 0,
        }),
        [data?.nextPage, data?.previousPage, data?.totalPages]
      )
    );

  const dataRows: ClassSessionRow[] = useMemo(() => {
    return (
      data?.results.map((r) => {
        return {
          hours: r.hours,
          teacher: { name: r.teacher?.name, lastName: r.teacher?.lastName },
          date: r.date,
          studentCount: r._count.classSessionStudent,
        };
      }) ?? []
    );
  }, [data?.results]);

  const table = useReactTable({
    columns: defaultColumns,
    data: dataRows,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading)
    return (
      <section className="flex justify-center">
        <Spinner size="sm" />
      </section>
    );
  if (!data?.results.length)
    return (
      <section className="flex w-full justify-center">
        <p className="italic">No hay clases disponibles</p>
      </section>
    );

  return (
    <section>
      <PaginationControls
        pageHandlers={{
          goFirst: goFirstPage,
          goLast: goLastPage,
          goNext: goNextPage,
          goPrevious: goPreviousPage,
        }}
        pageInfo={{
          page: data.page,
          nextPage: data.nextPage,
          previousPage: data.previousPage,
          totalPages: data.totalPages,
        }}
      />
      <section aria-label="items">
        <Table table={table} />
      </section>
    </section>
  );
};
