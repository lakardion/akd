import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from 'components/button';
import { Input } from 'components/form/input';
import Decimal from 'decimal.js';
import {
  ChangeEvent,
  FC,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import 'react-datepicker/dist/react-datepicker.css';
import { useFieldArray, useForm } from 'react-hook-form';
import { CalculatedDebt } from 'server/router/class-session/helpers';
import { trpc } from 'utils/trpc';
import { useDebouncedValue } from 'utils/use-debounce';
import { z } from 'zod';

export const formDebtorZod = z.object({
  studentId: z.string(),
  hours: z.string(),
  rate: z.string().refine((value) => {
    return parseFloat(value) > 0;
  }, 'El valor/h no puede ser cero'),
});

const debtorsFormZod = z.object({
  debtors: z.array(formDebtorZod),
});
export type DebtorsFormInput = z.infer<typeof debtorsFormZod>;

export const useStudentDebtors = (
  studentIds: string[],
  hourOnChange: (hour: string) => void,
  classSessionId?: string
) => {
  const [hoursForm, setHoursForm] = useState(0);
  const debouncedHours = useDebouncedValue(hoursForm, 500);
  const debouncedStudents = useDebouncedValue(studentIds, 500);
  const { data: calculatedDebts } = trpc.useQuery(
    [
      'students.calculateDebts',
      { hours: debouncedHours, studentIds: debouncedStudents, classSessionId },
    ],
    {
      enabled: Boolean(debouncedHours && debouncedStudents),
      keepPreviousData: true,
      //data will never be stale on its own, it is the user that has to perform an action for this data to become stale
      refetchOnWindowFocus: false,
    }
  );

  const customHourChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setHoursForm(e.target.value ? parseFloat(e.target.value) : 0);
      hourOnChange(e.target.value);
    },
    [hourOnChange]
  );
  const areThereUnconfiguredDebtors = useMemo(
    () =>
      Boolean(
        hoursForm !== 0 &&
          calculatedDebts?.filter((d) => {
            if (
              !d.debt ||
              (d.debt?.action !== 'create' && d.debt?.action !== 'update')
            )
              return false;
            return !d.debt.rate;
          }).length
      ),
    [calculatedDebts, hoursForm]
  );

  return useMemo(
    () => ({
      calculatedDebts,
      customHourChange,
      areThereUnconfiguredDebtors,
    }),
    [areThereUnconfiguredDebtors, customHourChange, calculatedDebts]
  );
};

export type FormDebtor = z.infer<typeof formDebtorZod>;

const headers = ['Alumno', 'Horas', 'Valor/h', 'Total'];

export const DebtorsForm: FC<{
  onFinished: () => void;
  onSubmit: (data: { debtors: FormDebtor[] }) => void;
  debtorsFeed: (FormDebtor & { studentFullName: string })[];
}> = ({ onFinished, onSubmit, debtorsFeed }) => {
  const {
    control,
    register,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<DebtorsFormInput>({
    resolver: zodResolver(debtorsFormZod),
    defaultValues: { debtors: debtorsFeed },
    shouldUseNativeValidation: true,
  });

  const { fields } = useFieldArray({ control, name: 'debtors' });

  const localHandleSubmit = (formValues: DebtorsFormInput) => {
    onSubmit(formValues);
    onFinished();
  };

  return (
    <form
      onSubmit={handleSubmit(localHandleSubmit)}
      className="flex flex-col gap-3"
    >
      <h1 className="text-3xl font-medium text-center">¿Cómo pagarán?</h1>
      <section className="w-full px-3">
        <table className="w-full">
          <thead>
            <tr>
              {headers.map((h, idx) => (
                <th key={idx} className="">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fields.map((debtor, index) => {
              // aparently to do this sort of composite values we have to use watch. I'm pretty sure watch is a sort of hook, but they did not name it that bc it would lint error
              const [hours, rate] = watch([
                `debtors.${index}.hours`,
                `debtors.${index}.rate`,
              ]);
              const isRateInvalid = Boolean(errors?.debtors?.[index]?.rate);
              const safeHour = !isNaN(parseInt(hours)) ? parseFloat(hours) : 0;
              const safeRate = !isNaN(parseInt(rate)) ? parseFloat(rate) : 0;
              const hourDec = new Decimal(safeHour);
              const rateDec = new Decimal(safeRate);
              const total = hourDec.times(rateDec);
              return (
                <tr key={debtor.id}>
                  <td className="p-1">
                    <p className="text-sm text-center whitespace-nowrap">
                      {debtorsFeed[index]?.studentFullName}
                    </p>
                  </td>
                  <td className="p-1">
                    <div className="flex justify-center w-full">
                      {debtorsFeed[index]?.hours}
                    </div>
                  </td>
                  <td className="p-1">
                    <div className="flex justify-center w-full">
                      {/*
                        TODO:
                        I would like this to be a react-select that could also swap to be a readonly field. I know that's kind of crazy but would do a pretty cool UX
                        This way we would be able to allow the user to either input a total value or pick an existing rate.
                        We would not supoprt setting the rate on our own maybe
                       */}
                      <Input
                        key={debtor.id}
                        {...register(`debtors.${index}.rate`)}
                        className={`w-20 text-center m-auto`}
                        invalid={isRateInvalid}
                      />
                    </div>
                  </td>
                  <td className="text-center p-1">
                    <div className="flex justify-between w-full">
                      <p>$</p>
                      <p className="text-center flex-grow">
                        {total.toNumber()}
                      </p>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      <section aria-label="form controls" className="flex gap-2 w-full">
        <Button type="submit" className="flex-grow">
          Listo
        </Button>
        <Button onClick={onFinished} className="flex-grow">
          Cancelar
        </Button>
      </section>
    </form>
  );
};
