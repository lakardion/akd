import { zodResolver } from '@hookform/resolvers/zod';
import { PaymentMethodType } from '@prisma/client';
import {
  ColumnDef,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { datePickerZod } from 'common';
import { PillButton } from 'components/button';
import { Input } from 'components/form/input';
import { ValidationError } from 'components/form/validation-error';
import { Table } from 'components/table';
import { format, parse } from 'date-fns';
import { Decimal } from 'decimal.js';
import { ChangeEvent, FC, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import ReactSelect, { SingleValue } from 'react-select';
import { trpc } from 'utils/trpc';
import { z } from 'zod';

const paymentFormZod = z.object({
  hours: z
    .string()
    .min(1, 'Requerido')
    .refine((value) => value !== '0', 'Must be greater than 0'),
  value: z
    .string()
    .min(1, 'Requerido')
    .refine((value) => value !== '0', 'Must be a number'),
  date: datePickerZod,
  paymentMethod: z.enum([PaymentMethodType.CASH, PaymentMethodType.TRANSFER]),
});
type PaymentFormInput = z.infer<typeof paymentFormZod>;

type HourType = 'package' | 'rate';
type HourTypeSelectOption = SingleValue<
  { value: HourType; label: string } | undefined
>;
type HourPackageSelectOption = SingleValue<{
  value: string;
  label: string;
  extra: { hours: number; amount: number };
}>;

type HourRateSelectOption = SingleValue<{
  value: string;
  label: string;
  extra: { rate: number };
}>;

export const PaymentForm: FC<{ studentId: string; onFinished: () => void }> = ({
  studentId,
  onFinished,
}) => {
  const { data: hourRates } = trpc.useQuery([
    'rates.hourRates',
    { type: 'STUDENT' },
  ]);
  const queryClient = trpc.useContext();
  const { data: hourPackages } = trpc.useQuery(['rates.hourPackages']);
  const { mutateAsync: create, isLoading: isCreating } = trpc.useMutation(
    'payments.create',
    {
      onSuccess: () => {
        queryClient.invalidateQueries([
          'payments.byStudent',
          { id: studentId },
        ]);
      },
    }
  );
  const [hourTypeSelected, setHourTypeSelected] =
    useState<HourTypeSelectOption>();
  const [selectedHourRate, setSelectedHourRate] = useState<number>();
  const handleHourTypeChange = (option: HourTypeSelectOption) => {
    setHourTypeSelected(option);
    setSelectedHourRate(undefined);
    setValue('value', '');
  };
  const {
    formState: { errors },
    handleSubmit,
    register,
    setValue,
    getValues,
    control,
  } = useForm<PaymentFormInput>({ resolver: zodResolver(paymentFormZod) });
  const value = useWatch<PaymentFormInput>({ name: 'value', control });

  const packageOptions: HourPackageSelectOption[] = useMemo(
    () =>
      hourPackages?.map((hp) => ({
        value: hp.id,
        label: `${hp.description} (x${hp.packHours})`,
        extra: { hours: hp.packHours, amount: hp.totalValue },
      })) ?? [],
    [hourPackages]
  );
  const handlePackageChange = (option: HourPackageSelectOption) => {
    setValue('hours', option?.extra.hours.toString() ?? '');
    setValue('value', option?.extra.amount.toString() ?? '');
  };
  const hourRateOptions: HourRateSelectOption[] = useMemo(
    () =>
      hourRates?.map((hr) => ({
        value: hr.id,
        label: hr.description,
        extra: { rate: hr.rate },
      })) ?? [],
    [hourRates]
  );

  const handleRateOptionChange = (
    options: HourRateSelectOption | undefined
  ) => {
    setSelectedHourRate(options?.extra.rate);
    const hours = getValues().hours;
    if (!hours) return;
    const decimalHours = new Decimal(hours);
    const decimalRate = new Decimal(options?.extra.rate ?? 1);
    setValue('value', decimalHours.times(decimalRate).toString());
  };

  const { onChange: onChangeHours, ...restRegisterHours } = useMemo(
    () => register('hours'),
    [register]
  );

  const handleHourChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChangeHours(e);
    if (!e.target.value) {
      setValue('value', '0');
      return;
    }
    if (hourTypeSelected?.value === 'rate') {
      const decimalValue = new Decimal(e.target.value);
      const hourRateDecimal = new Decimal(selectedHourRate ?? 1);
      setValue('value', decimalValue.times(hourRateDecimal).toString());
    }
  };

  const onSubmit = async (data: PaymentFormInput) => {
    await create({
      studentId,
      date: parse(data.date, 'yyyy-MM-dd', new Date()),
      hours: parseFloat(data.hours),
      value: parseFloat(data.value),
      paymentMethod: data.paymentMethod,
    });
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
      <Input {...register('date')} type="date" />
      <ValidationError errorMessages={errors.date?.message} />
      <label>Tipo de hora</label>
      <ReactSelect
        placeholder="Seleccionar tipo de hora"
        options={[
          { value: 'rate', label: 'Ratio por hora' },
          { value: 'package', label: 'Paquete de horas' },
        ]}
        value={hourTypeSelected}
        onChange={handleHourTypeChange}
        className="text-blackish-900 akd-container"
        classNamePrefix={'akd'}
      />
      {hourTypeSelected?.value === 'package' ? (
        <>
          <label>Paquete de horas</label>
          <ReactSelect
            options={packageOptions}
            placeholder="Seleccioná un paquete..."
            onChange={handlePackageChange}
            className="text-blackish-900 akd-container"
            key="hour-package"
            classNamePrefix="akd"
          />
          <label htmlFor="value">Cantidad de horas</label>
          <Input
            type="number"
            readOnly
            onChange={handleHourChange}
            placeholder="Cantidad de horas..."
            {...restRegisterHours}
          />
          <ValidationError errorMessages={errors.hours?.message} />
        </>
      ) : (
        <>
          <label>Ratio de hora</label>
          <ReactSelect
            options={hourRateOptions}
            placeholder="Seleccioná un ratio..."
            onChange={handleRateOptionChange}
            className="text-blackish-900 akd-container"
            key="hour-rate"
            classNamePrefix={'akd'}
          />
          <label htmlFor="hours">Cantidad de horas</label>
          <Input
            type="number"
            onChange={handleHourChange}
            {...restRegisterHours}
            placeholder="Cantidad de horas..."
          />
          <ValidationError errorMessages={errors.hours?.message} />
        </>
      )}
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
      <div className="py-4">
        <Input
          readOnly
          type="number"
          hidden
          {...register('value')}
          //  className=" text-center text-blackish text-6xl rounded-lg"
        />
        {value && parseInt(value) ? (
          <>
            <label htmlFor="value" className="text-2xl">
              Total
            </label>
            <p className="text-center text-blackish text-6xl rounded-lg p-3">
              $ {value}
            </p>
          </>
        ) : null}
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

const defaultColumns: ColumnDef<{
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
  const { data } = trpc.useQuery(['payments.byStudent', { id: studentId }], {
    enabled: Boolean(studentId),
  });

  const table = useReactTable({
    data: data ?? [],
    columns: defaultColumns,
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
