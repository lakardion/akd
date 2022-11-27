import { zodResolver } from '@hookform/resolvers/zod';
import {
  ColumnDef,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Button, PillButton } from 'components/button';
import { ClassSessionForm } from 'components/class-sessions/form';
import { Input } from 'components/form';
import { PaginationControls } from 'components/pagination-controls';
import { Spinner } from 'components/spinner';
import { Table } from 'components/table';
import { WarningMessage } from 'components/warning-message';
import { addDays, format, parse } from 'date-fns';
import { ChangeEvent, FC, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { MdClose } from 'react-icons/md';
import ReactSelect, { SingleValue } from 'react-select';
import { usePaginationHandlers } from 'utils/pagination';
import { trpc } from 'utils/trpc';
import { z } from 'zod';

const attachToExistingClassSessionZod = z.object({
  classSessionId: z.string(),
});
type AttachToExistingClassSessionInput = z.infer<
  typeof attachToExistingClassSessionZod
>;

//TODO: add debtors logic here as well. And debtors' form
const ExistingAttachClassSessionForm: FC<{
  goBack: () => void;
  onFinished: () => void;
  studentId: string;
}> = ({ goBack, onFinished, studentId }) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [classSessionSelected, setClassSessionSelected] =
    useState<SingleValue<{ value: string; label: string }>>();
  const { handleSubmit, control } = useForm<AttachToExistingClassSessionInput>({
    resolver: zodResolver(attachToExistingClassSessionZod),
  });
  const utils = trpc.useContext();
  const {
    mutateAsync: attachToExistingClassSession,
    isLoading: isAttachingToClass,
  } = trpc.classSessions.addStudent.useMutation({
    onSuccess: () => {
      utils.classSessions.all.invalidate();
      utils.classSessions.byDate.invalidate();
      utils.classSessions.byStudent.invalidate();
      utils.classSessions.paginated.invalidate();
      utils.classSessions.single.invalidate();
      utils.students.single.invalidate({ id: studentId });
    },
  });
  const onSubmit = async () => {
    if (!classSessionSelected) return;
    await attachToExistingClassSession({
      classSessionId: classSessionSelected.value,
      studentId,
    });
    onFinished();
  };

  const {
    data: classSessionByDate,
    isFetching,
    isLoading,
  } = trpc.classSessions.byDate.useQuery(
    {
      from: parse(selectedDate, 'yyyy-MM-dd', new Date()),
      to: addDays(parse(selectedDate, 'yyyy-MM-dd', new Date()), 1),
    },
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
      className="flex w-full flex-col gap-3"
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
          <ReactSelect<SingleValue<{ value: string; label: string }>>
            onBlur={field.onBlur}
            ref={field.ref}
            options={classSessionOptions}
            onChange={(option) => {
              setClassSessionSelected(option);
              field.onChange(option?.value);
            }}
            value={classSessionSelected}
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
        <PillButton
          variant="accent"
          type="submit"
          className="flex-grow"
          isLoading={isAttachingToClass}
          spinnerSize="xs"
        >
          Agregar a clase
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

type AttachToClassView = 'create' | 'existing' | 'main';

export const StudentAttachToClassSessionForm: FC<{
  onFinished: () => void;
  studentInfo: { value: string; label: string };
}> = ({ onFinished, studentInfo }) => {
  const [view, setView] = useState<AttachToClassView>('main');
  const createSwitchToViewHandler = (view: AttachToClassView) => () => {
    setView(view);
  };
  const goBack = createSwitchToViewHandler('main');

  const preloadedStudents = useMemo(() => [studentInfo], [studentInfo]);

  if (view === 'create') {
    return (
      <ClassSessionForm
        id=""
        onFinished={onFinished}
        preloadedStudents={preloadedStudents}
        fromStudent={studentInfo.value}
      />
    );
  }
  if (view === 'existing') {
    return (
      <ExistingAttachClassSessionForm
        goBack={goBack}
        onFinished={onFinished}
        studentId={studentInfo.value}
      />
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
          className="flex w-full flex-grow flex-col justify-evenly gap-5"
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
  const { data, isFetching, isLoading, isPreviousData } =
    trpc.classSessions.paginated.useQuery({ page, studentId });
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
      data?.results.map((r) => ({
        hours: r.hours,
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
