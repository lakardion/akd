import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from 'components/button';
import { Input } from 'components/form/input';
import { ValidationError } from 'components/form/validation-error';
import { Modal } from 'components/modal';
import { WarningMessage } from 'components/warning-message';
import { format, setHours, setMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import Decimal from 'decimal.js';
import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Controller, useForm } from 'react-hook-form';
import ReactSelect, { MultiValue, SingleValue } from 'react-select';
import AsyncReactSelect from 'react-select/async';
import { CalculatedDebt } from 'server/router/class-session/helpers';
import { diffStrArrays } from 'utils';
import {
  debouncedSearchStudents,
  debouncedSearchTeachers,
} from 'utils/client-search-utils';
import { inferQueryOutput, trpc } from 'utils/trpc';
import { z } from 'zod';
import {
  DebtorsForm,
  DebtorsFormInput,
  FormDebtor,
  formDebtorZod,
  useStudentDebtors,
} from './debtors';

const classSessionFormZod = z.object({
  teacherId: z.string({ required_error: 'Requerido' }).min(1, 'Requerido'),
  students: z.array(z.string()),
  dateTime: z.date({ required_error: 'Requerido' }),
  teacherHourRateId: z.string().min(1, 'Requerido'),
  hours: z
    .string()
    .min(1, 'Requerido')
    .refine((value) => {
      return !isNaN(parseInt(value));
    }, 'Must be a number'),
  debtors: z.array(formDebtorZod),
});
type ClassSessionFormInputs = z.infer<typeof classSessionFormZod>;

const getClassSessionFormDefaultValues = (
  classSession: inferQueryOutput<'classSessions.single'> | undefined,
  preloads: {
    teacher?: { value: string; label: string };
    students?: { value: string; label: string }[];
  }
): ClassSessionFormInputs => {
  return {
    dateTime: classSession?.date ?? new Date(),
    hours: classSession?.hour?.toString() ?? '',
    students: preloads.students
      ? preloads.students.map((ps) => ps.value)
      : classSession?.studentOptions?.map((so) => so.value) ?? [],
    teacherHourRateId: classSession?.teacherHourRateOption?.value ?? '',
    teacherId: preloads.teacher
      ? preloads.teacher.value
      : classSession?.teacherOption?.value ?? '',
    debtors: [],
  };
};

const getStaticDate = () => {
  const date = new Date();
  date.setHours(8);
  date.setMinutes(0);
  date.setSeconds(0);
  date.setMilliseconds(0);

  return date;
};

const useClassSessionForm = ({
  id,
  preloadedStudents,
  preloadTeacher,
}: {
  id: string;
  preloadedStudents?: { value: string; label: string }[];
  preloadTeacher?: { value: string; label: string };
}) => {
  //! this is refetching constantly and I have no clue why is that
  const { data: classSession } = trpc.useQuery(
    ['classSessions.single', { id }],
    {
      refetchOnWindowFocus: false,
    }
  );
  const { data: teacherHourRates } = trpc.useQuery(
    ['rates.hourRates', { type: 'TEACHER' }],
    { refetchOnWindowFocus: false }
  );

  const stablePreloads = useMemo(() => {
    return {
      teacher: preloadTeacher,
      students: preloadedStudents,
    };
  }, [preloadTeacher, preloadedStudents]);

  const form = useForm<ClassSessionFormInputs>({
    resolver: zodResolver(classSessionFormZod),
    defaultValues: getClassSessionFormDefaultValues(
      classSession,
      stablePreloads
    ),
  });
  const stableFormReset = useMemo(() => {
    return form.reset;
  }, [form.reset]);

  useEffect(() => {
    stableFormReset(
      getClassSessionFormDefaultValues(classSession, stablePreloads)
    );

    //consistently update the react select options as well
    classSession?.studentOptions?.length &&
      setSelectedStudents(classSession?.studentOptions);
    classSession?.teacherOption &&
      setSelectedTeacher(classSession?.teacherOption);
    classSession?.teacherHourRateOption &&
      setSelectedTeacherRate(classSession.teacherHourRateOption);
  }, [stableFormReset, classSession, stablePreloads]);

  //select controlled values
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  //! this is not meant to be I must remove this and find a better way to solve this issue. I so... hate this..
  useEffect(() => {
    setSelectedDate(classSession ? classSession.date : getStaticDate());
  }, [classSession]);

  const handleDateChange = useCallback(
    (date: Date) => {
      const setValue = form.setValue;
      setSelectedDate(date);
      setValue('dateTime', date);
    },
    [form.setValue]
  );
  const [selectedTeacher, setSelectedTeacher] = useState<
    SingleValue<{ value: string; label: string }>
  >(preloadTeacher ?? null);
  const [selectedStudents, setSelectedStudents] = useState<
    MultiValue<SingleValue<{ value: string; label: string }>>
  >(preloadedStudents ?? []);
  const [selectedTeacherRate, setSelectedTeacherRate] =
    useState<SingleValue<{ value: string; label: string }>>(null);

  const teacherRateOptions = useMemo(() => {
    return teacherHourRates?.map((thr) => ({
      value: thr.id,
      label: `${thr.description} (${thr.rate})`,
    }));
  }, [teacherHourRates]);

  const parsedStudentsError: string[] = useMemo(() => {
    const studentErrors = form.formState.errors.students;
    if (Array.isArray(studentErrors)) {
      return studentErrors.flatMap((s) => (s.message ? [s.message] : []));
    }
    return [];
  }, [form.formState.errors.students]);

  return useMemo(
    () => ({
      form,
      teacherRateOptions,
      parsedStudentsError,
      selectedTeacher,
      setSelectedTeacher,
      selectedDate,
      setSelectedDate,
      selectedTeacherRateId: selectedTeacherRate,
      setSelectedTeacherRateId: setSelectedTeacherRate,
      selectedStudents,
      setSelectedStudents,
      handleDateChange,
      oldHours: classSession?.hour,
      oldStudents: classSession?.studentOptions?.map((so) => so.value) ?? [],
    }),
    [
      form,
      handleDateChange,
      parsedStudentsError,
      selectedDate,
      selectedStudents,
      selectedTeacher,
      selectedTeacherRate,
      teacherRateOptions,
      classSession,
    ]
  );
};

export const ClassSessionForm: FC<{
  id: string;
  onFinished: () => void;
  fromStudent?: string;
  preloadedStudents?: { value: string; label: string }[];
  preloadTeacher?: { value: string; label: string };
}> = ({ id, onFinished, preloadedStudents, preloadTeacher, fromStudent }) => {
  const {
    form: {
      handleSubmit,
      formState: { errors },
      control,
      register,
      setValue,
      watch,
    },
    parsedStudentsError,
    selectedDate,
    selectedStudents,
    selectedTeacher,
    selectedTeacherRateId,
    setSelectedStudents,
    setSelectedTeacher,
    setSelectedTeacherRateId,
    teacherRateOptions,
    handleDateChange,
    oldHours,
    oldStudents,
  } = useClassSessionForm({ id, preloadedStudents, preloadTeacher });

  const formDebtors = watch('debtors');

  const queryClient = trpc.useContext();

  const { mutateAsync: create, isLoading: isCreating } = trpc.useMutation(
    'classSessions.create',
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['classSessions.all']);
        queryClient.invalidateQueries(['classSessions.byStudent']);
        queryClient.invalidateQueries([
          'teachers.single',
          { id: data.teacherId ?? '' },
        ]);
        const month = format(data.date, 'yy-MM');
        data.teacherId &&
          queryClient.invalidateQueries([
            'teachers.history',
            //for some reason teacherId is optional in the DB, maybe I knew better, I just don't like this coalescing here
            { teacherId: data.teacherId, month },
          ]);

        if (fromStudent) {
          queryClient.invalidateQueries([
            'students.history',
            { month, studentId: fromStudent },
          ]);
          queryClient.invalidateQueries([
            'students.single',
            { id: fromStudent },
          ]);
        }
      },
    }
  );
  const { mutateAsync: edit, isLoading: isEditing } = trpc.useMutation(
    'classSessions.update',
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['classSessions.single', { id }]);
      },
    }
  );

  const onSubmit = async (data: ClassSessionFormInputs) => {
    //it would be nice if we could do something regarding this iteration. Calculated debts do not change really and we can do sort of indexation of that so that we know where each debt should go to. I'm thinking of <studentId,calculatedDebtIndex>. I don't see this as a risky operation tbh
    const debtsByStudentId = data.debtors.reduce<
      Record<string, typeof data['debtors'][0]>
    >((res, d) => {
      res[d.studentId] = d;
      return res;
    }, {});

    const injectedDebts = calculatedDebts?.map<CalculatedDebt>((cd, idx) => {
      const matchingIdx = originalCalculatedDebtIdxByStudentId?.[cd.studentId];
      if (
        !cd.debt ||
        idx !== matchingIdx ||
        (cd.debt.action !== 'create' && cd.debt.action !== 'update')
      )
        return cd;

      const studentDebt = debtsByStudentId?.[cd.studentId];
      return {
        studentFullName: cd.studentFullName,
        studentId: cd.studentId,
        studentBalanceAction: cd.studentBalanceAction,
        debt:
          cd.debt.action === 'create'
            ? {
                ...cd.debt,
                rate: studentDebt?.rate
                  ? new Decimal(studentDebt.rate).toNumber()
                  : undefined,
              }
            : {
                ...cd.debt,
                rate: studentDebt?.rate
                  ? new Decimal(studentDebt.rate).toNumber()
                  : cd.debt.rate,
              },
      };
    });

    id
      ? //TODO: add debtors here as well. Editing can cause new debtors
        await edit({
          date: data.dateTime,
          hours: parseFloat(data.hours),
          studentIds: data.students ?? [],
          teacherHourRateId: data.teacherHourRateId,
          teacherId: data.teacherId,
          oldHours: oldHours ?? 0,
          oldStudentIds: oldStudents,
          debts: injectedDebts,
          id,
        })
      : await create({
          hours: parseFloat(data.hours),
          date: data.dateTime,
          studentIds: data.students,
          teacherId: data.teacherId,
          teacherHourRateId: data.teacherHourRateId,
          debts: injectedDebts,
        });
    onFinished();
  };

  const studentIds = useMemo(() => {
    return selectedStudents.flatMap((s) => (s ? [s.value] : []));
  }, [selectedStudents]);

  const handleHourChange = (hour: string) => {
    setValue('hours', hour);
  };
  //Not okay with this solution, might want to do something better some other time if I ever come up with a better way of performing this validation
  const { customHourChange, calculatedDebts, areThereUnconfiguredDebtors } =
    useStudentDebtors(studentIds, handleHourChange, id);

  const [showDebtorsForm, setShowDebtorsForm] = useState(false);
  const handleDebtorsFormOpen = () => {
    setShowDebtorsForm(true);
  };
  const handleDebtorsFormFinished = () => {
    setShowDebtorsForm(false);
  };

  const handleSetDebtors = (formValues: DebtorsFormInput) => {
    setValue('debtors', formValues.debtors);
  };

  const calculatedDebtsReduced = useMemo(() => {
    return calculatedDebts?.reduce<{
      debts: {
        studentId: string;
        studentFullName: string;
        rate: string;
        hours: string;
      }[];
      originalIdxByStudentId: Record<string, number>;
    }>(
      (res, cd, idx) => {
        if (
          !cd.debt ||
          (cd.debt.action !== 'create' && cd.debt.action !== 'update')
        )
          return res;

        res.debts.push({
          studentId: cd.studentId,
          studentFullName: cd.studentFullName,
          rate: cd.debt.rate?.toString() ?? '',
          hours: cd.debt.hours.toString(),
        });
        res.originalIdxByStudentId[cd.studentId] = idx;
        return res;
      },
      { debts: [], originalIdxByStudentId: {} }
    );
  }, [calculatedDebts]);

  const [debtorsFeed, originalCalculatedDebtIdxByStudentId] = useMemo(() => {
    if (!formDebtors.length)
      return [
        calculatedDebtsReduced?.debts ?? [],
        calculatedDebtsReduced?.originalIdxByStudentId,
      ] as const;
    //iterate once to get a map off of them and make checking against these easier. otherwise we would have to do includes on each loop
    const formDebtorsMap = formDebtors.reduce<Record<string, FormDebtor>>(
      (res, curr) => {
        res[curr.studentId] = curr;
        return res;
      },
      {}
    );
    const mappedResult =
      calculatedDebtsReduced?.debts.map((d) => ({
        ...d,
        rate: formDebtorsMap[d.studentId]?.rate ?? d?.rate?.toString(),
      })) ?? [];
    return [
      mappedResult,
      calculatedDebtsReduced?.originalIdxByStudentId,
    ] as const;
  }, [
    calculatedDebtsReduced?.debts,
    calculatedDebtsReduced?.originalIdxByStudentId,
    formDebtors,
  ]);

  const handleDebtors = (
    students: MultiValue<SingleValue<{ label: string; value: string }>>
  ) => {
    const studentDebtorIds = formDebtors.map((d) => d.studentId);
    const studentIds = students.flatMap((s) => (s ? [s.value] : []));
    const removed = diffStrArrays(studentIds, studentDebtorIds)[1];
    //if removed, we want to remove it as well from the debtors array
    if (removed.length) {
      setValue(
        'debtors',
        formDebtors.filter((d) => !removed.includes(d.studentId))
      );
      return;
    }
    //if added, we don't need to do anything, this is already handled by the areDebtorsInSync
  };

  const areDebtorsInSync = useMemo(() => {
    return calculatedDebtsReduced?.debts?.length === formDebtors.length;
  }, [calculatedDebtsReduced?.debts?.length, formDebtors.length]);

  const showDebtorsWarning = !areDebtorsInSync && areThereUnconfiguredDebtors;

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
        <h1 className="text-3xl text-center">
          {id ? 'Editar clase' : 'Agregar clase'}
        </h1>
        <label htmlFor="dateTime">Fecha</label>
        <Controller
          name="dateTime"
          control={control}
          render={() => (
            <ReactDatePicker
              selected={selectedDate}
              onChange={handleDateChange}
              showTimeSelect
              dateFormat={'Pp'}
              timeFormat={'p'}
              locale={es}
              className="bg-secondary-100 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blackish-900 placeholder:text-slate-500 text-black"
              minTime={setMinutes(setHours(new Date(), 8), 0)}
              maxTime={setMinutes(setHours(new Date(), 19), 0)}
            />
          )}
        />
        {errors.dateTime ? (
          <p className="font-medium text-red-500">{errors.dateTime.message}</p>
        ) : null}
        <label htmlFor="teacherId">Profesor</label>
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
        <label htmlFor="teacherHourRateId">Ratio del profesor</label>
        <Controller
          name="teacherHourRateId"
          control={control}
          render={({ field }) => (
            <ReactSelect
              onBlur={field.onBlur}
              ref={field.ref}
              className="text-black akd-container"
              classNamePrefix="akd"
              onChange={(value) => {
                field.onChange(value?.value ?? '');
                setSelectedTeacherRateId(value);
              }}
              value={selectedTeacherRateId}
              placeholder="Seleccionar ratio de hora"
              options={teacherRateOptions}
            />
          )}
        />
        <ValidationError errorMessages={errors.teacherHourRateId?.message} />
        <label htmlFor="hours">Horas</label>
        <Input
          type="number"
          placeholder="Agregar horas..."
          {...register('hours')}
          onChange={customHourChange}
        />
        <ValidationError errorMessages={errors.hours?.message} />
        <label htmlFor="students">Alumnos</label>
        <Controller
          name="students"
          control={control}
          render={({ field }) => (
            <AsyncReactSelect
              loadOptions={debouncedSearchStudents}
              isMulti
              defaultOptions
              onBlur={field.onBlur}
              ref={field.ref}
              className="text-black akd-container"
              classNamePrefix="akd"
              onChange={(value) => {
                handleDebtors(value);
                field.onChange(value.map((v) => v?.value));
                setSelectedStudents(value);
              }}
              value={selectedStudents}
              placeholder="Buscar alumnos..."
            />
          )}
        />
        <ValidationError errorMessages={parsedStudentsError} />
        {showDebtorsWarning ? (
          <button
            type="button"
            className="transition-transform transform hover:scale-95"
            onClick={handleDebtorsFormOpen}
          >
            <WarningMessage>
              Algunos alumnos no tienen la suficiente cantidad de horas para
              adherirse a esta clase, por favor resuelve cómo se deberían cargar
              sus deudas
            </WarningMessage>
          </button>
        ) : null}
        {areDebtorsInSync && formDebtors.length ? (
          <button
            type="button"
            className="text-blue-500 text-sm hover:underline self-start"
            onClick={handleDebtorsFormOpen}
          >
            Editar valores/h
          </button>
        ) : null}
        <section aria-label="action buttons" className="flex gap-2">
          <Button
            variant="primary"
            type="submit"
            className="capitalize flex-grow"
            isLoading={isCreating || isEditing}
            disabled={showDebtorsWarning}
          >
            {id ? 'Editar clase' : 'Crear clase'}
          </Button>
          <Button
            variant="primary"
            onClick={onFinished}
            className="capitalize flex-grow"
          >
            cancelar
          </Button>
        </section>
      </form>
      {showDebtorsForm ? (
        <Modal
          onBackdropClick={handleDebtorsFormFinished}
          className="w-[90%] md:w-[60%] max-w-[500px] bg-white drop-shadow-2xl"
        >
          <DebtorsForm
            onFinished={handleDebtorsFormFinished}
            onSubmit={handleSetDebtors}
            debtorsFeed={debtorsFeed}
          />
        </Modal>
      ) : null}
    </>
  );
};
