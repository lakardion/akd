import { useAutoAnimate } from '@formkit/auto-animate/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { TeacherFormInput, teacherFormZod } from 'common';
import { Button, PillButton } from 'components/button';
import { ConfirmForm } from 'components/confirm-form';
import { Input } from 'components/form/input';
import { ValidationError } from 'components/form/validation-error';
import { Modal } from 'components/modal';
import { Spinner } from 'components/spinner';
import { SwitchFree } from 'components/switch';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FC, MouseEvent, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { MdDelete, MdEdit } from 'react-icons/md';
import { debouncePromiseValue } from 'utils/delay';
import { trpc } from 'utils/trpc';
import { useDebouncedValue } from 'utils/use-debounce';

const TeacherForm: FC<{ onFinished: () => void; id: string }> = ({
  id: id,
  onFinished,
}) => {
  const queryClient = trpc.useContext();
  const { data } = trpc.useQuery(['teachers.teacher', { id }], {
    enabled: Boolean(id),
  });
  const { mutateAsync: create, isLoading: isCreating } = trpc.useMutation(
    'teachers.create',
    {
      onSuccess: () => {
        queryClient.invalidateQueries('teachers.allSearch');
      },
    }
  );
  const { mutateAsync: edit, isLoading: isEditing } = trpc.useMutation(
    'teachers.edit',
    {
      onSuccess: () => {
        queryClient.invalidateQueries('teachers.allSearch');
        queryClient.invalidateQueries(['teachers.teacher', { id }]);
      },
    }
  );
  const onSubmit = async (data: TeacherFormInput) => {
    const updated = id ? await edit({ id, ...data }) : await create(data);
    onFinished();
  };

  const defaultValues: TeacherFormInput = useMemo(
    () => ({
      lastName: data?.lastName ?? '',
      name: data?.name ?? '',
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
      <h1>{id ? 'Editar alumno' : 'Agregar profesor'}</h1>
      <label htmlFor="lastName">Apellido</label>
      <Input {...register('lastName')} placeholder="Last name..." />
      <ValidationError errorMessages={errors.lastName?.message} />
      <label htmlFor="name">Nombre</label>
      <Input {...register('name')} placeholder="Name..." />
      <ValidationError errorMessages={errors.name?.message} />
      <section className="flex gap-3 w-full pt-2">
        <Button
          type="submit"
          className="flex-grow"
          isLoading={isCreating || isEditing}
        >
          {id ? 'Editar' : 'Agregar'}
        </Button>
        <Button onClick={onFinished} className="flex-grow">
          Cancelar
        </Button>
      </section>
    </form>
  );
};

const TeacherItem: FC<{
  teacher: { id: string; name: string; lastName: string; isActive: boolean };
  editHandler: (id: string) => void;
  deleteHandler: (id: string) => void;
}> = ({ deleteHandler, editHandler, teacher }) => {
  const { asPath } = useRouter();
  const [isActive, setIsActive] = useState(teacher.isActive);

  const queryClient = trpc.useContext();
  const { mutateAsync: changeIsActive } = trpc.useMutation('teachers.active', {
    onSuccess: () => {
      queryClient.invalidateQueries(['teachers.allSearch']);
    },
  });

  const debouncedChangeIsActive = useMemo(() => {
    return debouncePromiseValue<typeof changeIsActive>(changeIsActive, 200);
  }, [changeIsActive]);

  const handleToggleIsActive = (e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsActive((prevState) => {
      debouncedChangeIsActive({ id: teacher.id, isActive: !prevState });
      return !prevState;
    });
  };

  const handleEdit = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    editHandler(teacher.id);
  };
  const handleDelete = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    deleteHandler(teacher.id);
  };

  return (
    <Link href={`${asPath}/${teacher.id}`} key={teacher.id}>
      <li
        key={teacher.id}
        className="bg-gray-300 w-full rounded-md py-3 px-2 sm:px-20 flex justify-between items-center transition-transform hover:scale-95 hover:text-primary-600 hover:cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <p>
            {teacher.lastName} {teacher.name}
          </p>
        </div>
        <div className="flex gap-1 items-center">
          <button type="button" onClick={handleEdit}>
            <MdEdit
              size={20}
              className="fill-blackish-900 hover:fill-primary-400"
            />
          </button>
          <button type="button" onClick={handleDelete}>
            <MdDelete
              size={20}
              className="fill-blackish-900 hover:fill-primary-400"
            />
          </button>
          <SwitchFree
            size={15}
            toggle={handleToggleIsActive}
            value={isActive}
          />
        </div>
      </li>
    </Link>
  );
};

const TeachersList: FC<{
  handleDelete: (id: string) => void;
  handleEdit: (id: string) => void;
}> = ({ handleDelete, handleEdit }) => {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const { data, isLoading } = trpc.useInfiniteQuery(
    [
      'teachers.allSearch',
      {
        query: debouncedSearch,
      },
    ],
    {
      getNextPageParam: (lastPage) => {
        return lastPage.nextCursor
          ? { page: lastPage.nextCursor.page, size: lastPage.nextCursor.size }
          : undefined;
      },
    }
  );
  const [parent] = useAutoAnimate<HTMLUListElement>();
  const flatData = useMemo(() => {
    return data?.pages.flatMap((p) => p.teachers) ?? [];
  }, [data?.pages]);

  if (isLoading) {
    return (
      <div className="w-full flex justify-center">
        <Spinner size="sm" />
      </div>
    );
  }
  if (!flatData.length) {
    return <p>No hay profesores para mostrar</p>;
  }

  return (
    <ul
      className="flex flex-col items-center w-full gap-3 md:max-h-[700px] overflow-auto"
      ref={parent}
    >
      {isLoading ? (
        <Spinner size="sm" />
      ) : !flatData.length ? (
        <p>No hay profesores para mostrar</p>
      ) : (
        flatData.map((t) => {
          return (
            <TeacherItem
              teacher={{
                id: t.id,
                name: t.name,
                lastName: t.lastName,
                isActive: t.isActive,
              }}
              deleteHandler={handleDelete}
              editHandler={handleEdit}
              key={t.id}
            />
          );
        })
      )}
    </ul>
  );
};

const Teachers = () => {
  const [currentId, setCurrentId] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const queryClient = trpc.useContext();
  const { isLoading: isDeleting, mutateAsync: deleteOne } = trpc.useMutation(
    'teachers.delete',
    {
      onSuccess: () => {
        queryClient.invalidateQueries('teachers.allSearch');
      },
    }
  );
  const handleAdd = () => {
    setShowForm(true);
  };
  const handleFinished = () => {
    setCurrentId('');
    setShowForm(false);
    setShowConfirm(false);
  };
  const handleSubmitDelete = async () => {
    await deleteOne({ id: currentId });
    handleFinished();
  };
  const handleDelete = (id: string) => {
    setCurrentId(id);
    setShowConfirm(true);
  };

  const handleEdit = (id: string) => {
    setCurrentId(id);
    setShowForm(true);
  };

  return (
    <section className="flex flex-col gap-3 w-[90%] max-w-2xl p-4">
      <PillButton onClick={handleAdd} type="button">
        Agregar profesor
      </PillButton>
      {showForm ? (
        <Modal
          onBackdropClick={handleFinished}
          className="w-full md:w-auto bg-white drop-shadow-2xl"
        >
          <TeacherForm onFinished={handleFinished} id={currentId} />
        </Modal>
      ) : null}
      <TeachersList handleDelete={handleDelete} handleEdit={handleEdit} />
      {showConfirm ? (
        <Modal onBackdropClick={handleFinished}>
          <ConfirmForm
            body="Confirma eliminar este profesor"
            onCancel={handleFinished}
            onConfirm={handleSubmitDelete}
            isConfirming={isDeleting}
          />
        </Modal>
      ) : null}
    </section>
  );
};
export default Teachers;
