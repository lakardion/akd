import { zodResolver } from "@hookform/resolvers/zod";
import { StudentFormInput, studentFormZod } from "common";
import { Button } from "components/button";
import { Input } from "components/form/input";
import { ValidationError } from "components/form/validation-error";
import { Spinner } from "components/spinner";
import { FC, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { trpc } from "utils/trpc";

const StudentForm: FC<{ onFinished: () => void; studentId: string }> = ({
  studentId,
  onFinished,
}) => {
  const queryClient = trpc.useContext();
  const { data: student } = trpc.useQuery(["akd.getStudent", { studentId }], {
    enabled: Boolean(studentId),
  });
  const { mutateAsync: createStudent, isLoading: isCreating } =
    trpc.useMutation("akd.createStudent", {
      onSuccess: () => {
        queryClient.invalidateQueries("akd.students");
      },
    });
  const { mutateAsync: editStudent, isLoading: isEditing } = trpc.useMutation(
    "akd.editStudent",
    {
      onSuccess: () => {
        queryClient.invalidateQueries("akd.students");
        queryClient.invalidateQueries(["akd.getStudent", { studentId }]);
      },
    }
  );

  const onSubmit = async (data: StudentFormInput) => {
    const updatedStudent = studentId
      ? await editStudent({ studentId, ...data })
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
      <h1>{studentId ? "Editar alumno" : "Agregar alumno"}</h1>
      <label htmlFor="lastName">Apellido</label>
      <Input {...register("lastName")} placeholder="Last name..." />
      <ValidationError error={errors.name} />
      <label htmlFor="name">Nombre</label>
      <Input {...register("name")} placeholder="Name..." />
      <ValidationError error={errors.name} />
      <label htmlFor="university">Universidad</label>
      <Input {...register("university")} placeholder="University..." />
      <ValidationError error={errors.university} />
      <label htmlFor="faculty">Facultad</label>
      <Input {...register("faculty")} placeholder="Facultad..." />
      <ValidationError error={errors.faculty} />
      <label htmlFor="course">Carrera</label>
      <Input {...register("course")} placeholder="Carrera..." />
      <ValidationError error={errors.course} />
      <Button type="submit">{studentId ? "Editar" : "Agregar"}</Button>
      <Button onClick={onFinished}>Cancelar</Button>
    </form>
  );
};
const StudentList: FC<{
  handleDelete: (id: string) => void;
  handleEdit: (id: string) => void;
}> = ({ handleDelete, handleEdit }) => {
  const { data, isLoading: studentsLoading } = trpc.useQuery(["akd.students"]);
  if (studentsLoading) {
    return <Spinner size="xs" />;
  }
  if (!data?.students?.length) {
    return <p>No hay alumnos para mostrar</p>;
  }
  const createEditHandler = (id: string) => () => {
    handleEdit(id);
  };
  const createDeleteHandler = (id: string) => () => {
    handleDelete(id);
  };

  return (
    <ul>
      {data?.students.map((s) => {
        const status =
          s.hourBalance < 0
            ? "bg-red-500"
            : s.hourBalance === 0
            ? "bg-gray-500"
            : "bg-green-500";
        return (
          <li key={s.id} className="border border-slid border-teal-400">
            <p className="flex gap-2 items-center justify-between">
              <span>
                {s.lastName} {s.name}
              </span>
              <span
                className={`inline-block w-3 h-3 rounded-full ${status}`}
              ></span>
            </p>
            <button type="button" onClick={createEditHandler(s.id)}>
              Edit
            </button>
            <button type="button" onClick={createDeleteHandler(s.id)}>
              Delete
            </button>
          </li>
        );
      })}
    </ul>
  );
};

const Students = () => {
  const [currentStudentId, setCurrentStudentId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const queryClient = trpc.useContext();
  const { isLoading: isLoading, mutateAsync: deleteStudent } = trpc.useMutation(
    "akd.deleteStudent",
    {
      onSuccess: () => {
        queryClient.invalidateQueries("akd.students");
      },
    }
  );
  const handleAddStudent = () => {
    setShowForm(true);
  };
  const handleFinished = () => {
    setCurrentStudentId("");
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    await deleteStudent({ studentId: id });
  };
  const handleEdit = (id: string) => {
    setCurrentStudentId(id);
    setShowForm(true);
  };

  return (
    <section>
      <button onClick={handleAddStudent} type="button">
        Agregar alumno
      </button>
      {showForm ? (
        <StudentForm onFinished={handleFinished} studentId={currentStudentId} />
      ) : null}
      <StudentList handleDelete={handleDelete} handleEdit={handleEdit} />
    </section>
  );
};
export default Students;
