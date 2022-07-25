import { zodResolver } from "@hookform/resolvers/zod";
import { TeacherFormInput, teacherFormZod } from "common";
import { Button } from "components/button";
import { Input } from "components/form/input";
import { ValidationError } from "components/form/validation-error";
import { Spinner } from "components/spinner";
import { FC, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { trpc } from "utils/trpc";

const TeacherForm: FC<{ onFinished: () => void; id: string }> = ({
  id: id,
  onFinished,
}) => {
  const queryClient = trpc.useContext();
  const { data } = trpc.useQuery(["teachers.teacher", { id }], {
    enabled: Boolean(id),
  });
  const { mutateAsync: create, isLoading: isCreating } = trpc.useMutation(
    "teachers.create",
    {
      onSuccess: () => {
        queryClient.invalidateQueries("teachers.teachers");
      },
    }
  );
  const { mutateAsync: edit, isLoading: isEditing } = trpc.useMutation(
    "teachers.edit",
    {
      onSuccess: () => {
        queryClient.invalidateQueries("teachers.teachers");
        queryClient.invalidateQueries(["teachers.teacher", { id }]);
      },
    }
  );

  const onSubmit = async (data: TeacherFormInput) => {
    const updated = id ? await edit({ id, ...data }) : await create(data);
    onFinished();
  };

  const defaultValues: TeacherFormInput = useMemo(
    () => ({
      lastName: data?.lastName ?? "",
      name: data?.name ?? "",
    }),
    [data]
  );

  const {
    register,
    formState: { errors },
    control,
    handleSubmit,
    getValues,
    reset,
  } = useForm<TeacherFormInput>({
    resolver: zodResolver(teacherFormZod),
    defaultValues,
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2">
      <h1>{id ? "Editar alumno" : "Agregar profesor"}</h1>
      <label htmlFor="lastName">Apellido</label>
      <Input {...register("lastName")} placeholder="Last name..." />
      <ValidationError error={errors.lastName} />
      <label htmlFor="name">Nombre</label>
      <Input {...register("name")} placeholder="Name..." />
      <ValidationError error={errors.name} />
      <Button type="submit">{id ? "Editar" : "Agregar"}</Button>
      <Button onClick={onFinished}>Cancelar</Button>
    </form>
  );
};

const TeachersList: FC<{
  handleDelete: (id: string) => void;
  handleEdit: (id: string) => void;
}> = ({ handleDelete, handleEdit }) => {
  const { data, isLoading: studentsLoading } = trpc.useQuery([
    "teachers.teachers",
  ]);
  if (studentsLoading) {
    return <Spinner size="sm" />;
  }
  if (!data?.teachers?.length) {
    return <p>No hay profesores para mostrar</p>;
  }
  const createEditHandler = (id: string) => () => {
    handleEdit(id);
  };
  const createDeleteHandler = (id: string) => () => {
    handleDelete(id);
  };

  return (
    <ul>
      {data?.teachers.map((s) => {
        const status =
          s.balance < 0
            ? "bg-red-500"
            : s.balance === 0
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

const Teachers = () => {
  const [currentId, setCurrentId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const queryClient = trpc.useContext();
  const { isLoading: isLoading, mutateAsync: deleteOne } = trpc.useMutation(
    "teachers.delete",
    {
      onSuccess: () => {
        queryClient.invalidateQueries("teachers.teachers");
      },
    }
  );
  const handleAdd = () => {
    setShowForm(true);
  };
  const handleFinished = () => {
    setCurrentId("");
    setShowForm(false);
  };
  const handleDelete = async (id: string) => {
    await deleteOne({ id });
  };
  const handleEdit = (id: string) => {
    setCurrentId(id);
    setShowForm(true);
  };

  return (
    <section>
      <button onClick={handleAdd} type="button">
        Agregar profesor
      </button>
      {showForm ? (
        <TeacherForm onFinished={handleFinished} id={currentId} />
      ) : null}
      <TeachersList handleDelete={handleDelete} handleEdit={handleEdit} />
    </section>
  );
};
export default Teachers;
