import { zodResolver } from '@hookform/resolvers/zod';
import {
  ColumnDef,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { PillButton, Button } from 'components/button';
import { ClassSessionForm } from 'components/class-sessions/form';
import { Input, ValidationError } from 'components/form';
import { PaginationControls } from 'components/pagination-controls';
import { Spinner } from 'components/spinner';
import { Table } from 'components/table';
import { WarningMessage } from 'components/warning-message';
import { addDays, format, isMatch, parse } from 'date-fns';
import { ChangeEvent, FC, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { MdClose } from 'react-icons/md';
import ReactSelect, { SingleValue } from 'react-select';
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

const attachToExistingClassSessionZod = z.object({
  classSessionId: z.string(),
});
type AttachToExistingClassSessionInput = z.infer<
  typeof attachToExistingClassSessionZod
>;

const ExistingAttachClassSessionForm: FC<{
  goBack: () => void;
  onFinished: () => void;
}> = ({ goBack, onFinished }) => {
  const [selectedDate, setSelectedDate] = useState<string>();
  const { handleSubmit, control } = useForm<AttachToExistingClassSessionInput>({
    resolver: zodResolver(attachToExistingClassSessionZod),
  });
  const onSubmit = async () => {
    onFinished();
  };

  const {
    data: classSessionByDate,
    isFetching,
    isLoading,
  } = trpc.useQuery(
    [
      'classSessions.byDate',
      {
        from: parse(selectedDate!, 'yyyy-MM-dd', new Date()),
        to: addDays(parse(selectedDate!, 'yyyy-MM-dd', new Date()), 1),
      },
    ],
    {
      enabled: Boolean(selectedDate),
    }
  );
  const classSessionOptions: SingleValue<{ value: string; label: string }>[] =
    useMemo(
      () =>
        classSessionByDate?.map((csbd) => ({
          value: csbd.id,
          label: `${format(csbd.date, 'kk:mm')} - ${csbd.teacher?.name} ${
            csbd.teacher?.lastName
          }`,
        })) ?? [],
      [classSessionByDate]
    );
  const handleDateChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  return (
    <form
      name="attach-to-existing"
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-3 w-full"
    >
      <h1 className="text-3xl">Agregar a clase existente</h1>
      <label htmlFor="date">Fecha</label>
      <Input type="date" value={selectedDate} onChange={handleDateChange} />
      {!classSessionOptions.length && !(isFetching || isLoading) ? (
        <WarningMessage>No hay clases para esa fecha</WarningMessage>
      ) : null}
      <label htmlFor="classSessionId">Clase</label>
      <Controller
        control={control}
        name="classSessionId"
        render={({ field }) => (
          <ReactSelect
            onBlur={field.onBlur}
            ref={field.ref}
            options={classSessionOptions}
            onChange={(option) => {
              field.onChange(option?.value);
            }}
            isLoading={isFetching || isLoading}
            placeholder={'Seleccionar clase...'}
            noOptionsMessage={({ inputValue }) => (
              <p>No hay clases para esa fecha</p>
            )}
            isDisabled={!selectedDate || !classSessionOptions.length}
          />
        )}
      />
      <section className="flex w-full gap-3">
        <PillButton variant="accent" type="submit" className="flex-grow">
          Add to class
        </PillButton>
        <PillButton
          variant="accent"
          type="button"
          className="flex-grow"
          onClick={goBack}
        >
          Cancel
        </PillButton>
      </section>
    </form>
  );
};

const NewAttachClassSessionForm: FC<{
  goBack: () => void;
  onFinished: () => void;
}> = ({ goBack, onFinished }) => {
  const {
    handleSubmit,
    register,
    formState: { errors },
    control,
  } = useForm<ClassSessionFormInput>({
    resolver: zodResolver(classSessionFormZod),
  });
  const [selectedTeacher, setSelectedTeacher] =
    useState<SingleValue<{ value: string; label: string }>>();
  const onSubmit = async () => {
    onFinished();
  };

  return (
    <form
      name="create-from-scratch"
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-3"
    >
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
      <label htmlFor="date">Fecha</label>
      <Input type="date" {...register('date')} />
      <ValidationError errorMessages={errors.date?.message} />
      <section aria-label="action buttons" className="flex w-full">
        <PillButton variant="accent" type="submit" className="flex-grow">
          Crear clase y agregar alumno
        </PillButton>
        <PillButton variant="accent" onClick={goBack} className="flex-grow">
          Cancelar
        </PillButton>
      </section>
    </form>
  );
};

type AttachToClassView = 'create' | 'existing' | 'main';

export const StudentAttachToClassSessionForm: FC<{
  onFinished: () => void;
  studentInfo: SingleValue<{ value: string; label: string }>;
}> = ({ onFinished, studentInfo }) => {
  const [view, setView] = useState<AttachToClassView>('main');
  const createSwitchToViewHandler = (view: AttachToClassView) => () => {
    setView(view);
  };
  const goBack = createSwitchToViewHandler('main');

  if (view === 'create') {
    return (
      <ClassSessionForm
        id=""
        onFinished={onFinished}
        preloadedStudents={[studentInfo]}
      />
    );
  }
  if (view === 'existing') {
    return (
      <ExistingAttachClassSessionForm goBack={goBack} onFinished={onFinished} />
    );
  }

  if (view === 'main')
    return (
      <section className="relative flex flex-col gap-6 pt-5">
        <div
          aria-label="close modal"
          className="absolute top-1 right-1 hover:cursor-pointer hover:text-primary-500"
          onClick={onFinished}
        >
          <MdClose size={25} />
        </div>
        <h1 className="text-3xl">Agregar alumno a clase</h1>
        <section
          aria-label="add to class options"
          className="flex flex-col w-full gap-5 justify-evenly flex-grow"
        >
          <Button
            onClick={createSwitchToViewHandler('existing')}
            className="py-3"
          >
            Clase existente
          </Button>
          <Button
            type="button"
            onClick={createSwitchToViewHandler('create')}
            className="py-3"
          >
            Nueva clase
          </Button>
        </section>
      </section>
    );
  //this can never happen
  return null;
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
