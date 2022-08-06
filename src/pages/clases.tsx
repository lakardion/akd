import { useAutoAnimate } from "@formkit/auto-animate/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "components/button";
import { ConfirmForm } from "components/confirm-form";
import { Input } from "components/form/input";
import { ValidationError } from "components/form/validation-error";
import { Modal } from "components/modal";
import { Spinner } from "components/spinner";
import { WarningMessage } from "components/warning-message";
import { format, setHours, setMinutes } from "date-fns";
import { es } from "date-fns/locale";
import { useCRUDState } from "hooks";
import Link from "next/link";
import {
  FC,
  MouseEvent,
  UIEventHandler,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import ReactDatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Controller, useForm } from "react-hook-form";
import { MdDelete, MdEdit } from "react-icons/md";
import ReactSelect, { MultiValue, SingleValue } from "react-select";
import AsyncReactSelect from "react-select/async";
import {
  debouncedSearchStudents,
  debouncedSearchTeachers,
} from "utils/client-search-utils";
import { inferQueryOutput, trpc } from "utils/trpc";
import { z } from "zod";

registerLocale("es", es);

const classSessionFormZod = z.object({
  teacherId: z.string({ required_error: "Requerido" }).min(1, "Requerido"),
  students: z.array(z.string()),
  dateTime: z.date({ required_error: "Requerido" }),
  teacherHourRateId: z.string().min(1, "Requerido"),
  hours: z
    .string()
    .min(1, "Requerido")
    .refine((value) => {
      return !isNaN(parseInt(value));
    }, "Must be a number"),
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
  classSession: inferQueryOutput<"classSessions.single"> | undefined
): ClassSessionFormInputs => {
  return {
    dateTime: classSession?.date ?? new Date(),
    hours: classSession?.hour?.toString() ?? "",
    students: classSession?.studentOptions?.map((so) => so.value) ?? [],
    teacherHourRateId: classSession?.teacherHourRateOption?.value ?? "",
    teacherId: classSession?.teacherOption?.value ?? "",
  };
};

const useClassSessionForm = ({ id }: { id: string }) => {
  const { data: classSession } = trpc.useQuery([
    "classSessions.single",
    { id },
  ]);
  const { data: teacherHourRates } = trpc.useQuery([
    "rates.hourRates",
    { type: "TEACHER" },
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
      setValue("dateTime", date);
    },
    [form.setValue]
  );
  const [selectedTeacher, setSelectedTeacher] =
    useState<SingleValue<{ value: string; label: string }>>(null);
  const [selectedStudents, setSelectedStudents] = useState<
    MultiValue<SingleValue<{ value: string; label: string }>>
  >([]);
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
      oldStudents: classSession?.studentOptions?.map(so => so.value) ?? []
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
      classSession
    ]
  );
};

const ClassSessionForm: FC<{ id: string; onFinished: () => void }> = ({
  id,
  onFinished,
}) => {
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
    oldHours, oldStudents
  } = useClassSessionForm({ id });

  const queryClient = trpc.useContext();
  const { mutateAsync: create, isLoading: isCreating } = trpc.useMutation(
    "classSessions.create",
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["classSessions.all"]);
        queryClient.invalidateQueries(["classSessions.byStudent"]);
      },
    }
  );
  const { mutateAsync: edit, isLoading: isEditing } = trpc.useMutation('classSessions.update', {
    onSuccess: () => {
      queryClient.invalidateQueries(['classSessions.single', { id }])
    }
  })

  const onSubmit = async (data: ClassSessionFormInputs) => {
    id ? await edit({
      date: data.dateTime,
      hours: parseFloat(data.hours),
      studentIds: data.students ?? [],
      teacherHourRateId: data.teacherHourRateId,
      teacherId: data.teacherId,
      oldHours:oldHours ?? 0,
      oldStudentIds:oldStudents,
      id
    })
      : await create({
        hours: parseFloat(data.hours),
        date: data.dateTime,
        studentIds: data.students,
        teacherId: data.teacherId,
        teacherHourRateId: data.teacherHourRateId,
      })
    onFinished();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <h1 className="text-3xl text-center">
        {id ? "Editar clase" : "Agregar clase"}
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
            dateFormat={"Pp"}
            timeFormat={"p"}
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
              field.onChange(value?.value ?? "");
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
              field.onChange(value?.value ?? "");
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
        {...register("hours")}
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
          {id ? "Editar clase" : "Crear clase"}
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

const ClassSessionList: FC<{
  handleDelete: (id: string) => void;
  handleEdit: (id: string) => void;
}> = ({ handleDelete, handleEdit }) => {
  const { data, fetchNextPage, hasNextPage, isLoading, isFetching } =
    trpc.useInfiniteQuery(["classSessions.all", {}], {
      getNextPageParam: (lastPage) => {
        return lastPage.nextCursor ? { page: lastPage.nextCursor } : null;
      },
      keepPreviousData: true,
    });
  const [parent] = useAutoAnimate<HTMLUListElement>({ duration: 500 });
  const createEditHandler =
    (id: string) => (e: MouseEvent<HTMLButtonElement>) => {
      e?.stopPropagation();
      handleEdit(id);
    };
  const createDeleteHandler =
    (id: string) => (e: MouseEvent<HTMLButtonElement>) => {
      e?.stopPropagation();
      handleDelete(id);
    };
  // const stableFetchNextPage = useCallback(
  //   (page: number) => {
  //     fetchNextPage({ pageParam: page });
  //   },
  //   [fetchNextPage]
  // );
  const flatData = useMemo(() => {
    return data?.pages.flatMap((p) => p.classSessions) ?? [];
  }, [data?.pages]);
  const watchScroll: UIEventHandler<HTMLUListElement> = (e) => {
    /**
     * Some amount to start fetching before reaching the bottom
     */
    const queryThreshold = 1;
    const element = e.currentTarget;
    if (
      Math.abs(
        element.scrollHeight - element.clientHeight - element.scrollTop
      ) < queryThreshold &&
      !isFetching &&
      hasNextPage
    ) {
      fetchNextPage();
    }
  };

  return (
    <>
      <ul
        className="flex flex-col items-center w-full gap-3 md:max-h-[700px] overflow-auto"
        ref={parent}
        onScroll={watchScroll}
      >
        {isLoading ? (
          <Spinner size="sm" />
        ) : !flatData.length ? (
          <p>No hay clases para mostrar</p>
        ) : (
          flatData.map((s) => {
            const status = s.date < new Date() ? "opacity-60" : "";
            return (
              <li
                key={s.id}
                className={`bg-gray-300 w-full rounded-md py-3 px-2 sm:px-20 flex justify-between items-center ${status}`}
              >
                <div className="flex items-center gap-2">
                  <p>{format(s.date, "dd-MM-yyyy H:mm")}</p>
                  <p>
                    {s.teacher?.name} {s.teacher?.lastName}
                  </p>
                </div>
                <div className="flex gap-1 items-center">
                  <button type="button" onClick={createEditHandler(s.id)}>
                    <MdEdit
                      size={20}
                      className="fill-blackish-900 hover:fill-primary-400"
                    />
                  </button>
                  <button type="button" onClick={createDeleteHandler(s.id)}>
                    <MdDelete
                      size={20}
                      className="fill-blackish-900 hover:fill-primary-400"
                    />
                  </button>
                </div>
              </li>
            );
          })
        )}
      </ul>
    </>
  );
};

const ClassSessions = () => {
  const {
    handleCreate,
    handleDelete,
    handleEdit,
    handleFinished,
    showDeleteConfirm,
    showCreateEdit,
    currentId,
  } = useCRUDState();
  const { data: teacherCount, isLoading: isTeacherCountLoading } =
    trpc.useQuery(["teachers.count"]);
  const { data: teacherRates, isLoading: isHourRatesLoading } = trpc.useQuery([
    "rates.hourRates",
    { type: "TEACHER" },
  ]);
  const { isLoading: isClassSessionLoading } = trpc.useQuery(
    ["classSessions.single", { id: currentId }],
    { enabled: Boolean(currentId) }
  );
  const { isLoading } = trpc.useInfiniteQuery(["classSessions.all", {}], {
    getNextPageParam: (lastPage) => {
      return lastPage.nextCursor ? { page: lastPage.nextCursor } : null;
    },
    keepPreviousData: true,
  });

  const queryClient = trpc.useContext();
  const { mutateAsync: deleteOne, isLoading: isDeleting } = trpc.useMutation(
    "classSessions.delete",
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["classSessions.all"]);
      },
    }
  );
  const handleSubmitDelete = async () => {
    await deleteOne({ id: currentId });
    handleFinished();
  };

  const canCreate = teacherCount && teacherRates?.length;
  if (isLoading) {
    return (
      <section className="flex items-center w-full justify-center">
        <Spinner size="md" />
      </section>
    );
  }

  return (
    <section className="p-4 rounded-lg w-11/12 sm:max-w-2xl flex flex-col gap-3 items-center">
      {!canCreate ? (
        <section aria-label="warning" className="w-full">
          <WarningMessage>
            <p className="italic">
              No se pueden cargar clases a menos que haya{" "}
              <Link href="/profesores">
                <span className="text-blue-600 hover:underline hover:cursor-pointer">
                  profesores
                </span>
              </Link>{" "}
              y{" "}
              <Link href="/precios/profesores">
                <span className="text-blue-600 hover:underline hover:cursor-pointer">
                  ratios
                </span>
              </Link>
            </p>
          </WarningMessage>
        </section>
      ) : null}
      <button
        onClick={handleCreate}
        type="button"
        className="rounded-lg bg-primary-800 w-full p-3 text-white hover:bg-primary-400 :btn-disabled"
        disabled={!canCreate}
      >
        Agregar clase
      </button>
      <ClassSessionList handleDelete={handleDelete} handleEdit={handleEdit} />
      {showCreateEdit ? (
        <Modal
          onBackdropClick={handleFinished}
          className="w-full md:w-auto bg-white drop-shadow-2xl md:min-w-[400px]"
        >
          <ClassSessionForm onFinished={handleFinished} id={currentId} />
        </Modal>
      ) : null}
      {showDeleteConfirm ? (
        <Modal
          onBackdropClick={handleFinished}
          className="w-full md:w-auto bg-white drop-shadow-2xl"
        >
          <ConfirmForm
            onCancel={handleFinished}
            body="Confirma que deseas eliminar este alumno"
            isConfirming={isDeleting}
            onConfirm={handleSubmitDelete}
          />
        </Modal>
      ) : null}
    </section>
  );
};

export default ClassSessions;
