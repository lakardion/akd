import { zodResolver } from '@hookform/resolvers/zod';
import { PaymentMethodType } from '@prisma/client';
import {
  ColumnDef,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { datePickerZod } from 'common';
import { Button, PillButton } from 'components/button';
import { Input } from 'components/form/input';
import { ValidationError } from 'components/form/validation-error';
import { Table } from 'components/table';
import { format, parse } from 'date-fns';
import { Decimal } from 'decimal.js';
import { ChangeEvent, FC, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { MdClose } from 'react-icons/md';
import ReactSelect, { SingleValue } from 'react-select';
import { mapPaymentTypeToLabel } from 'utils/adapters';
import { trpc } from 'utils/trpc';
import { z } from 'zod';

const paymentFormZod = z.object({
  hours: z
    .string()
    .min(1, 'Requerido')
    .refine((value) => value !== '0', 'Debe ser mayor que cero'),
  value: z
    .string()
    .min(1, 'Requerido')
    .refine((value) => isNaN(parseInt(value)), 'Debe ser un número'),
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
  const { data: hourRates } = trpc.proxy.rates.hourRates.useQuery({
    type: 'STUDENT',
  });
  const utils = trpc.proxy.useContext();
  const queryClient = trpc.useContext();
  const { data: hourPackages } = trpc.proxy.rates.hourPackages.useQuery();
  const { mutateAsync: create, isLoading: isCreating } =
    trpc.proxy.payments.create.useMutation({
      onSuccess: (data) => {
        utils.payments.byStudent.invalidate({ id: studentId });
        utils.students.single.invalidate({ id: studentId });
        utils.students.history.invalidate({
          month: format(data.date, 'yy-MM'),
          studentId,
        });
      },
    });
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
  } = useForm<PaymentFormInput>({
    resolver: zodResolver(paymentFormZod),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      hours: '',
      paymentMethod: 'CASH',
      value: '',
    },
  });
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
      className="flex w-full flex-col gap-2 p-3 md:w-[500px]"
    >
      <h1 className="text-center text-3xl">Agregar pago</h1>
      <label htmlFor="date">Fecha</label>
      {/* TODO: swap this with a controller-rhf so that we don't have to deal with localization issues */}
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
        className="akd-container text-blackish-900"
        classNamePrefix={'akd'}
      />
      {hourTypeSelected?.value === 'package' ? (
        <>
          <label>Paquete de horas</label>
          <ReactSelect
            options={packageOptions}
            placeholder="Seleccioná un paquete..."
            onChange={handlePackageChange}
            className="akd-container text-blackish-900"
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
            className="akd-container text-blackish-900"
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
        <div className="flex flex-grow items-center justify-center gap-3">
          <label htmlFor="cash">
            {mapPaymentTypeToLabel[PaymentMethodType.CASH]}
          </label>
          <Input
            type="radio"
            id="cash"
            value={PaymentMethodType.CASH}
            {...register('paymentMethod')}
            className="h-6 w-full border-0"
          />
        </div>
        <div className="flex flex-grow items-center justify-center gap-3">
          <label htmlFor="transfer">
            {mapPaymentTypeToLabel[PaymentMethodType.TRANSFER]}
          </label>
          <Input
            type="radio"
            id="transfer"
            value={PaymentMethodType.TRANSFER}
            {...register('paymentMethod')}
            className="h-6 w-full border-0"
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
            <p className="rounded-lg p-3 text-center text-6xl text-blackish">
              $ {value}
            </p>
          </>
        ) : null}
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

//TODO: wtf I'm not using this anywhere??
export const PaymentTable: FC<{ studentId: string }> = ({ studentId }) => {
  const { data } = trpc.proxy.payments.byStudent.useQuery(
    { id: studentId },
    {
      enabled: Boolean(studentId),
    }
  );

  const table = useReactTable({
    data: data ?? [],
    columns: defaultColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (!data?.length)
    return (
      <section className="flex w-full items-center justify-center font-medium italic">
        <p>No hay pagos para mostrar</p>
      </section>
    );

  return <Table table={table} />;
};

export const PaymentsList: FC<{ studentId: string }> = ({ studentId }) => {
  const { data } = trpc.proxy.payments.byStudent.useQuery(
    { id: studentId },
    {
      enabled: Boolean(studentId),
    }
  );

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

const createDebtPaymentZod = (debtValue: number) =>
  z
    .object({
      paysTotal: z.boolean().default(true),
      amount: z
        .string()
        .refine((value) => !isNaN(parseInt(value)), {
          message: 'Debe ser un número',
        })
        .optional(),
      paymentMethod: z.enum([
        PaymentMethodType.CASH,
        PaymentMethodType.TRANSFER,
      ]),
      date: datePickerZod,
    })
    .refine(
      (values) => {
        if (values.paysTotal) return true;
        if (
          !values.paysTotal &&
          values?.amount &&
          parseFloat(values.amount) <= 0
        )
          return true;
        return true;
      },
      {
        message: 'Si no paga el total, debe haber un valor de pago parcial',
        path: ['amount'],
      }
    )
    .refine(
      (values) => {
        if (parseFloat(values?.amount ?? '0') > debtValue) {
          return false;
        }
        return true;
      },
      {
        message:
          'El valor del monto parcial no puede superar al monto total de la deuda',
        path: ['amount'],
      }
    );

type DebtPaymentFormInput = z.infer<ReturnType<typeof createDebtPaymentZod>>;

const DebtPaymentForm: FC<{ studentId: string; onFinished: () => void }> = ({
  studentId,
  onFinished,
}) => {
  const { data } = trpc.proxy.students.single.useQuery(
    { id: studentId },
    {
      enabled: Boolean(studentId),
    }
  );
  const memoedResolver = useMemo(
    () => zodResolver(createDebtPaymentZod(data?.debts.amount ?? 0)),
    [data?.debts.amount]
  );
  const {
    register,
    handleSubmit,
    watch,
    formState: { isValid, errors },
  } = useForm<DebtPaymentFormInput>({
    resolver: memoedResolver,
    defaultValues: {
      amount: '0',
      paysTotal: true,
      date: format(new Date(), 'yyyy-MM-dd'),
      paymentMethod: PaymentMethodType.CASH,
    },
    mode: 'onChange',
  });
  //TODO: we will not support partial payment just yet I want to get other stuff finished first. Let's mark this as TODO. Created workitem to follow it up
  const paysTotal = watch('paysTotal');
  // const partialAmount = watch('amount');
  // const total = paysTotal ? amount?.toString() ?? '0' : partialAmount;
  // const rest = new Decimal(parseFloat(data?.debts?.toString() ?? '0'))
  //   .minus(new Decimal(parseFloat(partialAmount ?? '0')))
  //   .toString();
  // const shouldHideRest =
  //   paysTotal || parseInt(partialAmount ?? '') === 0 || isNaN(parseInt(rest));

  const utils = trpc.proxy.useContext();
  const queryClient = trpc.useContext();
  const { mutateAsync: payDebt, isLoading: isPaying } =
    trpc.proxy.payments.payDebtTotal.useMutation({
      onSuccess() {
        utils.students.single.invalidate({ id: studentId });
        utils.students.allSearch.invalidate();
        utils.students.history.invalidate();
      },
    });
  const { amount, hours } = data?.debts ?? {};
  const onSubmit = async (values: DebtPaymentFormInput) => {
    // const parsed = createDebtPaymentZod(data?.debts ?? 0).safeParse(values);
    if (values.paysTotal) {
      await payDebt({
        date: parse(values.date, 'yyyy-MM-dd', new Date()),
        paymentMethod: values.paymentMethod,
        studentId,
      });
      onFinished();
      return;
    }
    //TODO: if pays partial we would call another endpoint most likely (or we could think of how to do this in a single one)
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2">
      <div>
        <h1 className="text-center text-3xl">Saldar deuda</h1>
      </div>
      <label htmlFor="date">Fecha</label>
      {/* TODO: swap this with a controller-rhf so that we don't have to deal with localization issues */}
      <Input {...register('date')} type="date" />
      <ValidationError errorMessages={errors.date?.message} />
      {/* <div className="flex items-center justify-center gap-3">
        <label className="text-2xl">
          Pago total
          <Input
            type="checkbox"
            {...register('paysTotal')}
            className="ml-3 h-6 w-6 border-0"
          />
        </label>
      </div> */}
      {paysTotal ? null : (
        <div className="flex flex-col justify-center">
          <label className="text-2xl">Monto parcial</label>
          <Input type="number" {...register('amount')} className="" />
        </div>
      )}
      <label htmlFor="paymentMethod">Medio de pago</label>
      <div className="flex items-center">
        <div className="flex flex-grow items-center justify-center gap-3">
          <label htmlFor="cash">
            {mapPaymentTypeToLabel[PaymentMethodType.CASH]}
          </label>
          <Input
            type="radio"
            id="cash"
            value={PaymentMethodType.CASH}
            {...register('paymentMethod')}
            className="h-6 w-full border-0"
          />
        </div>
        <div className="flex flex-grow items-center justify-center gap-3">
          <label htmlFor="transfer">
            {mapPaymentTypeToLabel[PaymentMethodType.TRANSFER]}
          </label>
          <Input
            type="radio"
            id="transfer"
            value={PaymentMethodType.TRANSFER}
            {...register('paymentMethod')}
            className="h-6 w-full border-0"
          />
        </div>
      </div>
      <div className="flex flex-col">
        <label className="text-2xl">Total</label>
        <div className="grid w-1/2 grid-cols-3 self-center text-6xl">
          <p className="col-span-1">$</p>
          <p className="col-span-2">{amount}</p>
        </div>
        {/* {shouldHideRest ? null : (
          <>
            <label className="text-xl">Resto</label>
            <div className="grid w-1/2 grid-cols-3 text-2xl">
              <p className="col-span-1">$</p>
              <p className="col-span-2">{rest}</p>
            </div>
          </>
        )} */}
      </div>
      <section aria-label="action buttons" className="flex gap-2 pt-3">
        <PillButton
          type="submit"
          className="flex-grow"
          variant="accent"
          disabled={!isValid}
          isLoading={isPaying}
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

type StudentPaymentsView = 'main' | 'debt' | 'hours';

export const StudentPayments: FC<{
  studentId: string;
  onFinished: () => void;
}> = ({ onFinished, studentId }) => {
  const [view, setView] = useState<StudentPaymentsView>('main');

  const createSwitchToViewHandler = (view: StudentPaymentsView) => () => {
    setView(view);
  };

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
        <h1 className="text-center text-3xl">Acción de pago</h1>
        <section
          aria-label="add to class options"
          className="flex w-full flex-grow flex-col justify-evenly gap-5"
        >
          <Button onClick={createSwitchToViewHandler('debt')} className="py-3">
            Saldar deuda
          </Button>
          <Button
            type="button"
            onClick={createSwitchToViewHandler('hours')}
            className="py-3"
          >
            Registrar pago de horas
          </Button>
        </section>
      </section>
    );
  if (view === 'debt')
    return <DebtPaymentForm studentId={studentId} onFinished={onFinished} />;

  return <PaymentForm onFinished={onFinished} studentId={studentId} />;
};
