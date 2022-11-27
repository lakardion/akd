import { zodResolver } from '@hookform/resolvers/zod';
import { PaymentMethodType } from '@prisma/client';
import {
  ColumnDef,
  getCoreRowModel,
  RowSelectionState,
  useReactTable,
} from '@tanstack/react-table';
import { datePickerZod } from 'common';
import { PillButton } from 'components/button';
import { Input } from 'components/form/input';
import { ValidationError } from 'components/form/validation-error';
import { IndeterminateCheckbox } from 'components/indeterminate-checkbox';
import { PaginationControls } from 'components/pagination-controls';
import { Spinner } from 'components/spinner';
import { Table } from 'components/table';
import { format, parse } from 'date-fns';
import { FC, useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { mapPaymentTypeToLabel } from 'utils/adapters';
import { usePaginationHandlers } from 'utils/pagination';
import { trpc } from 'utils/trpc';
import { z } from 'zod';

const paymentFormZod = z.object({
  date: datePickerZod,
  paymentMethod: z.enum([PaymentMethodType.CASH, PaymentMethodType.TRANSFER]),
  value: z.string(),
  classSessions: z.array(z.object({ id: z.string(), total: z.number() })),
});
type PaymentFormInput = z.infer<typeof paymentFormZod>;
type ClassSessionTableRow = {
  id: string;
  students: number;
  rate: number;
  total: number;
  date: Date;
  hours: number;
};
export const TeacherPaymentForm: FC<{
  teacherId: string;
  onFinished: () => void;
  month: string;
}> = ({ teacherId, onFinished, month }) => {
  const { data: teacher } = trpc.useQuery([
    'teachers.single',
    { id: teacherId },
  ]);
  const queryClient = trpc.useContext();
  const { data: unpaidClassSessions } = trpc.useQuery([
    'classSessions.unpaid',
    { teacherId },
  ]);
  const { mutateAsync: create, isLoading: isCreating } =
    trpc.proxy.teacherPayments.create.useMutation({
      onSuccess: () => {
        queryClient.invalidateQueries(['teachers.single', { id: teacherId }]);
        queryClient.invalidateQueries([
          'teachers.history',
          { teacherId: teacherId, month },
        ]);
      },
    });

  const {
    formState: { errors },
    handleSubmit,
    register,
    setValue,
    control,
  } = useForm<PaymentFormInput>({ resolver: zodResolver(paymentFormZod) });

  const { classSessions } = useWatch({ control });

  const columns = useMemo<ColumnDef<ClassSessionTableRow>[]>(
    () => [
      {
        id: 'selected',
        header: ({ table }) => (
          <IndeterminateCheckbox
            {...{
              checked: table.getIsAllRowsSelected(),
              indeterminate: table.getIsSomeRowsSelected(),
              onChange: table.getToggleAllRowsSelectedHandler(),
            }}
          />
        ),
        cell: ({ row }) => (
          <IndeterminateCheckbox
            {...{
              checked: row.getIsSelected(),
              onChange: row.getToggleSelectedHandler(),
              indeterminate: row.getIsSomeSelected(),
            }}
          />
        ),
      },
      {
        id: 'students',
        accessorKey: 'students',
        header: 'Alumnos',
      },
      {
        id: 'hours',
        accessorKey: 'hours',
        header: 'Horas',
      },
      {
        id: 'rate',
        accessorKey: 'rate',
        header: 'Ratio',
      },
      {
        id: 'total',
        accessorFn: (original) => `$ ${original.total}`,
        header: 'Total',
      },
    ],
    []
  );

  const stableData = useMemo(
    () =>
      unpaidClassSessions?.map<ClassSessionTableRow>((ucs) => ({
        date: ucs.date,
        hours: ucs.hours,
        id: ucs.id,
        rate: ucs.teacherHourRate.rate,
        students: ucs._count.classSessionStudent,
        total: ucs.total,
      })) ?? [],
    [unpaidClassSessions]
  );

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const table = useReactTable({
    columns,
    getCoreRowModel: getCoreRowModel(),
    data: stableData,
    state: {
      rowSelection,
    },
    //! Although this is an `onChange`, it does not receive the "new" value, instead it receives a function
    onRowSelectionChange: setRowSelection,
  });

  //! if only tanstack table allowed me to do this in the change handler rather than having to listen to the rowSelection. I don't like this much...
  useEffect(() => {
    const rows = Object.keys(rowSelection).map((k) => {
      const row = table.getRow(k);
      return {
        id: row.original.id,
        total: row.original.total,
      };
    });
    setValue('classSessions', rows);
  }, [rowSelection, setValue, table]);

  const onSubmit = async (data: PaymentFormInput) => {
    await create({
      teacherId,
      date: parse(data.date, 'yyyy-MM-dd', new Date()),
      value: parseFloat(data.value),
      paymentMethod: data.paymentMethod,
      classSessionIds: data.classSessions.map((cs) => cs.id),
    });
    onFinished();
  };

  //choose the hour rate to apply and the amount of hours OR the package
  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-full flex-col gap-2 p-3 md:w-[500px]"
    >
      <h1 className="text-center text-3xl">Agregar pago</h1>
      <label htmlFor="date">Fecha</label>
      <Input
        {...register('date')}
        type="date"
        defaultValue={format(new Date(), 'yyyy-MM-dd')}
      />
      <ValidationError errorMessages={errors.date?.message} />
      <label htmlFor="paymentMethod">Medio de pago</label>
      <div className="flex items-center">
        <div className="flex flex-grow items-center justify-center gap-3">
          <label htmlFor="cash">Efectivo</label>
          <Input
            type="radio"
            id="cash"
            value={PaymentMethodType.CASH}
            {...register('paymentMethod')}
            className="h-6 w-full border-0"
          />
        </div>
        <div className="flex flex-grow items-center justify-center gap-3">
          <label htmlFor="transfer">Transferencia</label>
          <Input
            type="radio"
            id="transfer"
            value={PaymentMethodType.TRANSFER}
            {...register('paymentMethod')}
            className="h-6 w-full border-0"
          />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <label htmlFor="classSessionIds">Clases no pagadas aun</label>
        <Table table={table} />
      </div>
      <div className="py-4">
        <Input
          readOnly
          type="number"
          hidden
          defaultValue={teacher?.balance?.toString() ?? ''}
          {...register('value')}
          //  className=" text-center text-blackish text-6xl rounded-lg"
        />
      </div>
      <div className="">
        <p className="rounded-lg p-3 text-center text-6xl text-blackish">
          $ {classSessions?.reduce((sum, curr) => sum + (curr?.total ?? 0), 0)}
        </p>
      </div>
      <section aria-label="action buttons" className="flex gap-2">
        <PillButton
          type="submit"
          className="flex-grow"
          variant="accent"
          isLoading={isCreating}
        >
          Agregar
        </PillButton>
        <PillButton className="flex-grow" onClick={onFinished} variant="accent">
          Cancelar
        </PillButton>
      </section>
    </form>
  );
};

type TeacherPaymentColumn = {
  value: number;
  date: Date;
  publicId: number;
  paymentMethod: PaymentMethodType;
};

const paymentColumns: ColumnDef<TeacherPaymentColumn>[] = [
  {
    id: 'publicId',
    accessorKey: 'publicId',
    header: '#',
  },
  {
    id: 'date',
    header: 'Día',
    accessorFn: (vals) => format(vals.date, 'dd-MM-yyyy'),
  },
  {
    id: 'paymentMethod',
    accessorFn: (vals) => `${mapPaymentTypeToLabel[vals.paymentMethod]}`,
    header: 'Método de pago',
  },
  {
    id: 'value',
    accessorFn: (vals) => `$ ${vals.value}`,
    header: 'Monto total',
  },
];

export const PaymentTable: FC<{ teacherId: string }> = ({ teacherId }) => {
  const [page, setPage] = useState(1);
  const { data, isLoading } = trpc.proxy.teacherPayments.all.useQuery(
    { teacherId, page },
    {
      enabled: Boolean(teacherId),
    }
  );

  const teacherPaymentRows: TeacherPaymentColumn[] = useMemo(() => {
    return (
      data?.results.map((tp) => ({
        date: tp.date,
        publicId: tp.id,
        value: tp.value,
        paymentMethod: tp.paymentMethod,
      })) ?? []
    );
  }, [data?.results]);
  const table = useReactTable({
    data: teacherPaymentRows,
    columns: paymentColumns,
    getCoreRowModel: getCoreRowModel(),
  });

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

  if (isLoading) {
    return (
      <div className="flex justify-center">
        <Spinner size="sm" />
      </div>
    );
  }
  if (!data?.results?.length)
    return (
      <section className="flex w-full items-center justify-center font-medium italic">
        <p>No hay pagos para mostrar</p>
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
