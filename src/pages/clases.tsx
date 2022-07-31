import { useAutoAnimate } from "@formkit/auto-animate/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "components/button";
import { ConfirmForm } from "components/confirm-form";
import { Input } from "components/form/input";
import { ValidationError } from "components/form/validation-error";
import { Modal } from "components/modal";
import { Spinner } from "components/spinner";
import { WarningMessage } from "components/warning-message";
import { format, setSeconds } from "date-fns";
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
import { trpc } from "utils/trpc";
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
  date.setHours(0);
  date.setMinutes(0);
  date.setSeconds(0);
  date.setMilliseconds(0);

  return date;
};
const staticDate = getStaticDate();

const ClassSessionForm: FC<{ id: string; onFinished: () => void }> = ({
  id,
  onFinished,
}) => {
  const { data: teacherHourRates } = trpc.useQuery([
    "rates.hourRates",
    { type: "TEACHER" },
  ]);
  const {
    formState: { errors },
    handleSubmit,
    register,
    control,
    setValue,
  } = useForm<ClassSessionFormInputs>({
    resolver: zodResolver(classSessionFormZod),
  });
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

  const onSubmit = async (data: ClassSessionFormInputs) => {
    await create({
      hours: parseFloat(data.hours),
      date: data.dateTime,
      studentIds: data.students,
      teacherId: data.teacherId,
      teacherHourRateId: data.teacherHourRateId,
    });
    onFinished();
  };
  const [selectedDate, setSelectedDate] = useState(staticDate);
  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    setValue("dateTime", date);
  };
  const [selectedTeacher, setSelectedTeacher] =
    useState<SingleValue<{ value: string; label: string }>>(null);
  const [selectedStudents, setSelectedStudents] = useState<
    MultiValue<SingleValue<{ value: string; label: string }>>
  >([]);
  const [selectedTeacherRateId, setSelectedTeacherRateId] =
    useState<SingleValue<{ value: string; label: string }>>(null);

  const teacherRateOptions = useMemo(() => {
    return teacherHourRates?.map((thr) => ({
      value: thr.id,
      label: `${thr.description} (${thr.rate})`,
    }));
  }, [teacherHourRates]);

  const parsedStudentsError: string[] = useMemo(() => {
    const studentErrors = errors.students;
    if (Array.isArray(studentErrors)) {
      return studentErrors.flatMap((s) => (s.message ? [s.message] : []));
    }
    return [];
  }, [errors.students]);

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
  const stableFetchNextPage = useCallback(
    (page: number) => {
      fetchNextPage({ pageParam: page });
    },
    [fetchNextPage]
  );
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
                className={`bg-gray-300 w-[95%] rounded-md py-3 px-2 sm:px-20 flex justify-between items-center transition-transform hover:scale-105 hover:text-primary-600 hover:cursor-pointer ${status}`}
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
  const { data: teacherCount } = trpc.useQuery(["teachers.count"]);
  const { data: teacherRates } = trpc.useQuery([
    "rates.hourRates",
    { type: "TEACHER" },
  ]);
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
        className="rounded-lg bg-primary-800 w-full p-3 text-white hover:bg-primary-400 disabled:hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed"
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
