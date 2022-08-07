import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from 'components/button';
import { Input } from 'components/form/input';
import { ValidationError } from 'components/form/validation-error';
import { WarningMessage } from 'components/warning-message';
import { setHours, setMinutes } from 'date-fns';
import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Controller, useForm } from 'react-hook-form';
import ReactSelect, { MultiValue, SingleValue } from 'react-select';
import AsyncReactSelect from 'react-select/async';
import {
  debouncedSearchStudents,
  debouncedSearchTeachers,
} from 'utils/client-search-utils';
import { inferQueryOutput, trpc } from 'utils/trpc';
import { z } from 'zod';

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
});
type ClassSessionFormInputs = z.infer<typeof classSessionFormZod>;

const getStaticDate = () => {
  const date = new Date();
  date.setHours(8);
  date.setMinutes(0);
  date.setSeconds(0);
  date.setMilliseconds(0);

  return date;
};

const staticDate = getStaticDate();

const getClassSessionFormDefaultValues = (
  classSession: inferQueryOutput<'classSessions.single'> | undefined
): ClassSessionFormInputs => {
  return {
    dateTime: classSession?.date ?? new Date(),
    hours: classSession?.hour?.toString() ?? '',
    students: classSession?.studentOptions?.map((so) => so.value) ?? [],
    teacherHourRateId: classSession?.teacherHourRateOption?.value ?? '',
    teacherId: classSession?.teacherOption?.value ?? '',
  };
};

const useClassSessionForm = ({
  id,
  preloadedStudents,
}: {
  id: string;
  preloadedStudents?: SingleValue<{ value: string; label: string }>[];
}) => {
  const { data: classSession } = trpc.useQuery([
    'classSessions.single',
    { id },
  ]);
  const { data: teacherHourRates } = trpc.useQuery([
    'rates.hourRates',
    { type: 'TEACHER' },
  ]);

  const form = useForm<ClassSessionFormInputs>({
    resolver: zodResolver(classSessionFormZod),
    defaultValues: getClassSessionFormDefaultValues(classSession),
  });
  const stableFormReset = useMemo(() => {
    return form.reset;
  }, [form.reset]);

  useEffect(() => {
    stableFormReset(getClassSessionFormDefaultValues(classSession));

    //consistently update the react select options as well
    classSession?.studentOptions?.length &&
      setSelectedStudents(classSession?.studentOptions);
    classSession?.teacherOption &&
      setSelectedTeacher(classSession?.teacherOption);
    classSession?.teacherHourRateOption &&
      setSelectedTeacherRate(classSession.teacherHourRateOption);
  }, [stableFormReset, classSession]);

  //select controlled values
  const [selectedDate, setSelectedDate] = useState(staticDate);
  const handleDateChange = useCallback(
    (date: Date) => {
      const setValue = form.setValue;
      setSelectedDate(date);
      setValue('dateTime', date);
    },
    [form.setValue]
  );
  const [selectedTeacher, setSelectedTeacher] =
    useState<SingleValue<{ value: string; label: string }>>(null);
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
  preloadedStudents?: SingleValue<{ value: string; label: string }>[];
}> = ({ id, onFinished, preloadedStudents }) => {
  const {
    form: {
      handleSubmit,
      formState: { errors },
      control,
      register,
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
  } = useClassSessionForm({ id, preloadedStudents });

  const queryClient = trpc.useContext();
  const { mutateAsync: create, isLoading: isCreating } = trpc.useMutation(
    'classSessions.create',
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['classSessions.all']);
        queryClient.invalidateQueries(['classSessions.byStudent']);
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
    id
      ? await edit({
          date: data.dateTime,
          hours: parseFloat(data.hours),
          studentIds: data.students ?? [],
          teacherHourRateId: data.teacherHourRateId,
          teacherId: data.teacherId,
          oldHours: oldHours ?? 0,
          oldStudentIds: oldStudents,
          id,
        })
      : await create({
          hours: parseFloat(data.hours),
          date: data.dateTime,
          studentIds: data.students,
          teacherId: data.teacherId,
          teacherHourRateId: data.teacherHourRateId,
        });
    onFinished();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <h1 className="text-3xl text-center">
        {id ? 'Editar clase' : 'Agregar clase'}
      </h1>
      <label htmlFor="dateTime">Fecha</label>
      <Controller
        name="dateTime"
        control={control}
        defaultValue={staticDate}
        render={() => (
          <ReactDatePicker
            selected={selectedDate}
            onChange={handleDateChange}
            showTimeSelect
            dateFormat={'Pp'}
            timeFormat={'p'}
            locale="es"
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
        defaultValue=""
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
        defaultValue=""
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
      />
      <ValidationError errorMessages={errors.hours?.message} />
      <label htmlFor="students">Alumnos</label>
      <Controller
        name="students"
        control={control}
        defaultValue={[]}
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
              field.onChange(value.map((v) => v?.value));
              setSelectedStudents(value);
            }}
            value={selectedStudents}
            placeholder="Buscar alumnos..."
          />
        )}
      />
      <ValidationError errorMessages={parsedStudentsError} />
      {selectedStudents?.length ? (
        <WarningMessage>
          A los alumnos seleccionados se les reducirá el balance de horas aun si
          no tienen horas disponibles
        </WarningMessage>
      ) : null}
      <section aria-label="action buttons" className="flex gap-2">
        <Button
          variant="primary"
          type="submit"
          className="capitalize flex-grow"
          isLoading={isCreating || isEditing}
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
  );
};
