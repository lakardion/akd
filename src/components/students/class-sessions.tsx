import { zodResolver } from '@hookform/resolvers/zod';
import {
  ColumnDef,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Input } from 'components/form/input';
import { ValidationError } from 'components/form/validation-error';
import { PaginationControls } from 'components/pagination-controls';
import { Spinner } from 'components/spinner';
import { Table } from 'components/table';
import { format, isMatch } from 'date-fns';
import { FC, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { SingleValue } from 'react-select';
import AsyncReactSelect from 'react-select/async';
import { debouncedSearchTeachers } from 'utils/client-search-utils';
import { trpc } from 'utils/trpc';
import { z } from 'zod';

const classSessionFormZod = z.object({
  date: z.string().refine((value) => {
    if (!isMatch(value, 'yyyy-MM-dd')) return false;
    return true;
  }, 'Invalid date, should be yyyy-mm-dd'),
  teacherId: z.string().min(1, 'Requerido'),
});

type ClassSessionFormInput = z.infer<typeof classSessionFormZod>;

export const ClassSessionForm: FC<{ onFinished: () => void }> = ({
  onFinished,
}) => {
  const {
    handleSubmit,
    register,
    formState: { errors },
    control,
  } = useForm<ClassSessionFormInput>({
    resolver: zodResolver(classSessionFormZod),
  });
  const onSubmit = async () => {};

  const [selectedTeacher, setSelectedTeacher] =
    useState<SingleValue<{ value: string; label: string }>>();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <h1 className="text-2xl">Cargar clase</h1>
      <label htmlFor="date">Fecha</label>
      <Input type="date" {...register('date')} />
      <ValidationError errorMessages={errors.date?.message} />

      <label>Profesor</label>
      <Controller
        name="teacherId"
        control={control}
        render={({ field }) => (
          <AsyncReactSelect
            loadOptions={debouncedSearchTeachers}
            defaultOptions
            onBlur={field.onBlur}
            ref={field.ref}
            className="text-black akd-container"
            classNamePrefix="akd"
            onChange={(value) => {
              field.onChange(value?.value ?? '');
              setSelectedTeacher(value);
            }}
            value={selectedTeacher}
            placeholder="Seleccionar profesor"
          />
        )}
      />
      <ValidationError errorMessages={errors.teacherId?.message} />
    </form>
  );
};
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
    accessorFn: (vals) => `$ ${vals.studentCount}`,
    header: 'Alumnos',
  },
];

export const ClassSessionTable: FC<{ studentId: string }> = ({ studentId }) => {
  const [page, setPage] = useState(1);
  const { data, isFetching, isLoading, isPreviousData } = trpc.useQuery([
    'classSessions.byStudentPaginated',
    { page, studentId },
  ]);

  const dataRows: ClassSessionRow[] = useMemo(() => {
    return (
      data?.results.map((r) => ({
        hours: r.hour.value,
        teacher: { name: r.teacher?.name, lastName: r.teacher?.lastName },
        date: r.date,
        studentCount: r._count.classSessionStudent,
      })) ?? []
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
  if (!data)
    return (
      <section className="flex w-full justify-center">
        <p className="italic">No hay clases disponibles</p>
      </section>
    );
  const goFirstPage = () => {
    setPage(1);
  };
  const goPreviousPage = () => {
    data?.nextPage && setPage(data.nextPage);
  };
  const goNextPage = () => {
    data?.nextPage && setPage(data.nextPage);
  };
  const goLastPage = () => {
    setPage(data.totalPages);
  };
  console.log({ data });
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
