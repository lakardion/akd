import { zodResolver } from '@hookform/resolvers/zod';
import { PaymentMethodType } from '@prisma/client';
import {
  ColumnDef,
  getCoreRowModel,
  RowSelectionState,
  Updater,
  useReactTable,
} from '@tanstack/react-table';
import { datePickerZod } from 'common';
import { PillButton } from 'components/button';
import { Input } from 'components/form/input';
import { ValidationError } from 'components/form/validation-error';
import { IndeterminateCheckbox } from 'components/indeterminate-checkbox';
import { Table } from 'components/table';
import { format } from 'date-fns';
import {
  ChangeEvent,
  FC,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
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
}> = ({ teacherId, onFinished }) => {
  const { data: teacher } = trpc.useQuery([
    'teachers.single',
    { id: teacherId },
  ]);
  const queryClient = trpc.useContext();
  const { data: unpaidClassSessions } = trpc.useQuery([
    'classSessions.unpaid',
    { teacherId },
  ]);
  const { mutateAsync: create, isLoading: isCreating } = trpc.useMutation(
    'teacherPayments.create',
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['teacherPayments.all']);
      },
    }
  );

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
        hours: ucs.hour.value,
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
    onRowSelectionChange: setRowSelection,
  });

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
    // await create({
    //   studentId: teacherId,
    //   date: parse(data.date, 'yyyy-MM-dd', new Date()),
    //   hours: parseFloat(data.hours),
    //   value: parseFloat(data.value),
    //   paymentMethod: data.paymentMethod,
    // });
    console.log(data);
    onFinished();
  };

  //choose the hour rate to apply and the amount of hours OR the package
  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col p-3 gap-2 w-full md:w-[500px]"
    >
      <h1 className="text-3xl text-center">Agregar pago</h1>
      <label htmlFor="date">Fecha</label>
      <Input
        {...register('date')}
        type="date"
        defaultValue={format(new Date(), 'yyyy-MM-dd')}
      />
      <ValidationError errorMessages={errors.date?.message} />
      <label htmlFor="paymentMethod">Medio de pago</label>
      <div className="flex items-center">
        <div className="flex-grow flex justify-center gap-3 items-center">
          <label htmlFor="cash">Efectivo</label>
          <Input
            type="radio"
            id="cash"
            value={PaymentMethodType.CASH}
            {...register('paymentMethod')}
            className="border-0 w-full h-6"
          />
        </div>
        <div className="flex-grow flex justify-center gap-3 items-center">
          <label htmlFor="transfer">Transferencia</label>
          <Input
            type="radio"
            id="transfer"
            value={PaymentMethodType.TRANSFER}
            {...register('paymentMethod')}
            className="border-0 h-6 w-full"
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
        <p className="text-center text-blackish text-6xl rounded-lg p-3">
          $ {classSessions?.reduce((sum, curr) => sum + (curr?.total ?? 0), 0)}
        </p>
      </div>
      <section aria-label="action buttons" className="flex gap-2">
        <PillButton type="submit" className="flex-grow" variant="accent">
          Agregar
        </PillButton>
        <PillButton className="flex-grow" onClick={onFinished} variant="accent">
          Cancelar
        </PillButton>
      </section>
    </form>
  );
};

const paymentColumns: ColumnDef<{
  value: number;
  hourValue: number;
  date: Date;
  publicId: number;
}>[] = [
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
    id: 'hourValue',
    accessorKey: 'hourValue',
    header: 'Horas',
  },
  {
    id: 'value',
    accessorFn: (vals) => `$ ${vals.value}`,
    header: 'Monto total',
  },
];

export const PaymentTable: FC<{ studentId: string }> = ({ studentId }) => {
  //TODO: change to teacher
  const { data } = trpc.useQuery(['payments.byStudent', { id: studentId }], {
    enabled: Boolean(studentId),
  });

  const table = useReactTable({
    data: data ?? [],
    columns: paymentColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (!data?.length)
    return (
      <section className="flex justify-center w-full items-center italic font-medium">
        <p>No hay pagos para mostrar</p>
      </section>
    );

  return <Table table={table} />;
};

export const PaymentsList: FC<{ studentId: string }> = ({ studentId }) => {
  const { data } = trpc.useQuery(['payments.byStudent', { id: studentId }], {
    enabled: Boolean(studentId),
  });

  return (
    <ul>
      {data?.map((p) => (
        <li key={p.id}>
          <p>$ {p.value}</p>
        </li>
      ))}
    </ul>
  );
};
