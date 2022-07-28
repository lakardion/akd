import { zodResolver } from "@hookform/resolvers/zod";
import { StudentFormInput, studentFormZod } from "common";
import { Button } from "components/button";
import { Input } from "components/form/input";
import { Label } from "components/form/label";
import { ValidationError } from "components/form/validation-error";
import { Spinner } from "components/spinner";
import { FC, MouseEvent, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { trpc } from "utils/trpc";
import { MdDelete, MdEdit } from "react-icons/md";
import { useRouter } from "next/router";
import Link from "next/link";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { Modal } from "components/modal";

const StudentForm: FC<{ onFinished: () => void; studentId: string }> = ({
  studentId,
  onFinished,
}) => {
  const queryClient = trpc.useContext();
  const { data: student } = trpc.useQuery(
    ["students.single", { id: studentId }],
    {
      enabled: Boolean(studentId),
    }
  );
  const { mutateAsync: createStudent, isLoading: isCreating } =
    trpc.useMutation("students.create", {
      onSuccess: () => {
        queryClient.invalidateQueries("students.all");
      },
    });
  const { mutateAsync: editStudent, isLoading: isEditing } = trpc.useMutation(
    "students.edit",
    {
      onSuccess: () => {
        queryClient.invalidateQueries("students.all");
        queryClient.invalidateQueries(["students.single", { id: studentId }]);
      },
    }
  );

  const onSubmit = async (data: StudentFormInput) => {
    const updatedStudent = studentId
      ? await editStudent({ id: studentId, ...data })
      : await createStudent(data);
    onFinished();
  };

  const defaultValues: StudentFormInput = useMemo(
    () => ({
      course: student?.course ?? "",
      faculty: student?.faculty ?? "",
      lastName: student?.lastName ?? "",
      name: student?.name ?? "",
      university: student?.university ?? "",
    }),
    [student]
  );

  const {
    register,
    formState: { errors },
    control,
    handleSubmit,
    getValues,
    reset,
  } = useForm<StudentFormInput>({
    resolver: zodResolver(studentFormZod),
    defaultValues,
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2">
      <h1 className="text-3xl text-center">
        {studentId ? "Editar alumno" : "Agregar alumno"}
      </h1>
      <Label
        className="border border-solid border-b-blackish-600/30"
        htmlFor="lastName"
      >
        Apellido
      </Label>
      <Input {...register("lastName")} placeholder="Last name..." />
      <ValidationError error={errors.name} />
      <Label htmlFor="name">Nombre</Label>
      <Input {...register("name")} placeholder="Name..." />
      <ValidationError error={errors.name} />
      <Label htmlFor="university">Universidad</Label>
      <Input {...register("university")} placeholder="University..." />
      <ValidationError error={errors.university} />
      <Label htmlFor="faculty">Facultad</Label>
      <Input {...register("faculty")} placeholder="Facultad..." />
      <ValidationError error={errors.faculty} />
      <Label htmlFor="course">Carrera</Label>
      <Input {...register("course")} placeholder="Carrera..." />
      <ValidationError error={errors.course} />
      <section aria-label="action buttons" className="flex gap-2 w-full">
        <Button className="flex-grow" type="submit">
          {studentId ? "Editar" : "Agregar"}
        </Button>
        <Button className="flex-grow" onClick={onFinished}>
          Cancelar
        </Button>
      </section>
    </form>
  );
};
const StudentList: FC<{
  handleDelete: (id: string) => void;
  handleEdit: (id: string) => void;
}> = ({ handleDelete, handleEdit }) => {
  const { data, isLoading: studentsLoading } = trpc.useQuery(["students.all"]);
  const { asPath } = useRouter();

  const [parent] = useAutoAnimate<HTMLUListElement>();

  if (studentsLoading) {
    return <Spinner size="sm" />;
  }
  if (!data?.students?.length) {
    return <p>No hay alumnos para mostrar</p>;
  }
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

  return (
    <ul
      className="flex flex-col justify-center items-center w-full"
      ref={parent}
    >
      {data?.students.map((s) => {
        const status =
          s.hourBalance < 0
            ? "bg-red-500"
            : s.hourBalance === 0
            ? "bg-gray-500"
            : "bg-green-500";
        const statusTitle =
          s.hourBalance < 0
            ? "El alumno debe horas"
            : s.hourBalance === 0
            ? "El alumno no tiene horas"
            : "El alumno tiene horas sin usar";
        return (
          <Link href={`${asPath}/${s.id}`} key={s.id}>
            <li
              key={s.id}
              className="bg-gray-300 w-full rounded-md py-3 px-2 sm:px-20 flex justify-between items-center transition-transform hover:scale-105 hover:text-primary-600 hover:cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${status} cursor-help mb-0.5`}
                  title={statusTitle}
                ></div>
                <p>
                  {s.lastName} {s.name}
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
          </Link>
        );
      })}
    </ul>
  );
};

const Students = () => {
  const [currentStudentId, setCurrentStudentId] = useState("");
  const [showCreateEditStudent, setShowCreateEditStudent] = useState(false);
  const queryClient = trpc.useContext();
  const { isLoading: isLoading, mutateAsync: deleteStudent } = trpc.useMutation(
    "students.delete",
    {
      onSuccess: () => {
        queryClient.invalidateQueries("students.all");
      },
    }
  );
  const handleAddStudent = () => {
    setShowCreateEditStudent(true);
  };
  const handleFinished = () => {
    setCurrentStudentId("");
    setShowCreateEditStudent(false);
  };

  const handleDelete = async (id: string) => {
    await deleteStudent({ id });
  };
  const handleEdit = (id: string) => {
    setCurrentStudentId(id);
    setShowCreateEditStudent(true);
  };

  return (
    <section className="p-4 rounded-lg w-11/12 sm:max-w-2xl flex flex-col gap-3 items-center">
      <button
        onClick={handleAddStudent}
        type="button"
        className="rounded-lg bg-primary-800 w-full p-3 text-white hover:bg-primary-400"
      >
        Agregar alumno
      </button>
      {showCreateEditStudent ? (
        <Modal
          onBackdropClick={handleFinished}
          className="w-full md:w-auto bg-white drop-shadow-2xl"
        >
          <StudentForm
            onFinished={handleFinished}
            studentId={currentStudentId}
          />
        </Modal>
      ) : null}
      <StudentList handleDelete={handleDelete} handleEdit={handleEdit} />
    </section>
  );
};
export default Students;
