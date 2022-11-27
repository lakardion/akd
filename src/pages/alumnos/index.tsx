import { zodResolver } from '@hookform/resolvers/zod';
import { StudentFormInput, studentFormZod } from 'common';
import { Button } from 'components/button';
import { ConfirmForm } from 'components/confirm-form';
import { Input } from 'components/form/input';
import { ValidationError } from 'components/form/validation-error';
import { Modal } from 'components/modal';
import { Spinner } from 'components/spinner';
import { useCRUDState } from 'hooks';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  ChangeEvent,
  FC,
  MouseEvent,
  UIEventHandler,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useForm } from 'react-hook-form';
import { MdDelete, MdEdit } from 'react-icons/md';
import { usePopulateFakeStudents } from 'utils/fake-hooks';
import { trpc } from 'utils/trpc';
import { useDebouncedValue } from 'utils/use-debounce';

const StudentForm: FC<{ onFinished: () => void; studentId: string }> = ({
  studentId,
  onFinished,
}) => {
  const utils = trpc.proxy.useContext();
  const { data: student } = trpc.proxy.students.single.useQuery(
    { id: studentId },
    {
      enabled: Boolean(studentId),
    }
  );
  const { mutateAsync: createStudent, isLoading: isCreating } =
    trpc.proxy.students.create.useMutation({
      onSuccess: () => {
        utils.students.allSearch.invalidate();
      },
    });
  const { mutateAsync: editStudent, isLoading: isEditing } =
    trpc.proxy.students.edit.useMutation({
      onSuccess: () => {
        utils.students.allSearch.invalidate();
        utils.students.single.invalidate({ id: studentId });
      },
    });

  const onSubmit = async (data: StudentFormInput) => {
    const updatedStudent = studentId
      ? await editStudent({ id: studentId, ...data })
      : await createStudent(data);
    onFinished();
  };

  const defaultValues: StudentFormInput = useMemo(
    () => ({
      course: student?.course ?? '',
      faculty: student?.faculty ?? '',
      lastName: student?.lastName ?? '',
      name: student?.name ?? '',
      university: student?.university ?? '',
    }),
    [student]
  );

  const {
    register,
    formState: { errors },
    handleSubmit,
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
      <h1 className="text-center text-3xl">
        {studentId ? 'Editar alumno' : 'Agregar alumno'}
      </h1>
      <label htmlFor="lastName">Apellido</label>
      <Input {...register('lastName')} placeholder="Last name..." />
      <ValidationError errorMessages={errors.lastName?.message} />
      <label htmlFor="name">Nombre</label>
      <Input {...register('name')} placeholder="Name..." />
      <ValidationError errorMessages={errors.name?.message} />
      <label htmlFor="university">Universidad</label>
      <Input {...register('university')} placeholder="University..." />
      <ValidationError errorMessages={errors.university?.message} />
      <label htmlFor="faculty">Facultad</label>
      <Input {...register('faculty')} placeholder="Facultad..." />
      <ValidationError errorMessages={errors.faculty?.message} />
      <label htmlFor="course">Carrera</label>
      <Input {...register('course')} placeholder="Carrera..." />
      <ValidationError errorMessages={errors.course?.message} />
      <section aria-label="action buttons" className="flex w-full gap-2">
        <Button className="flex-grow" type="submit">
          {studentId ? 'Editar' : 'Agregar'}
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
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 500);
  const {
    data: paginatedStudents,
    fetchNextPage,
    hasNextPage,
    isLoading: studentsLoading,
    isFetching: studentsFetching,
  } = trpc.proxy.students.allSearch.useInfiniteQuery(
    { query: debouncedSearch },
    {
      getNextPageParam: (lastPage) => {
        return lastPage.nextCursor
          ? { page: lastPage.nextCursor, size: lastPage.size }
          : null;
      },
      keepPreviousData: true,
    }
  );

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };
  const { asPath } = useRouter();
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

  const flatStudents = useMemo(() => {
    return paginatedStudents?.pages.flatMap((p) => p.students) ?? [];
  }, [paginatedStudents?.pages]);

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
      !studentsFetching &&
      hasNextPage
    ) {
      fetchNextPage();
    }
  };

  return (
    <div className="flex w-full flex-grow flex-col gap-3">
      <input
        value={search}
        placeholder="Buscar alumnos..."
        onChange={handleSearchChange}
        className="w-full rounded-md bg-secondary-100 px-3 py-1 text-black placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blackish-900"
      />
      <ul
        className="flex w-full flex-grow flex-col items-center gap-3 overflow-auto"
        onScroll={watchScroll}
      >
        {studentsLoading ? (
          <Spinner size="sm" />
        ) : !flatStudents.length ? (
          <p>No hay alumnos para mostrar</p>
        ) : (
          flatStudents.map((s) => {
            const inactiveClasses = !s.isActive ? 'opacity-50' : '';
            const status = !s.isActive
              ? 'bg-white'
              : s.totalDebt > 0
              ? 'bg-red-500'
              : s.hourBalance === 0
              ? 'bg-gray-500'
              : 'bg-green-500';
            const statusTitle = !s.isActive
              ? 'El alumno está desactivado'
              : s.hourBalance < 0
              ? 'El alumno debe horas'
              : s.hourBalance === 0
              ? 'El alumno no tiene horas'
              : 'El alumno tiene horas sin usar';
            return (
              <Link href={`${asPath}/${s.id}`} key={s.id}>
                <li
                  key={s.id}
                  className={`flex w-full items-center justify-between rounded-md bg-gray-300 py-3 px-2 transition-transform hover:scale-95 hover:cursor-pointer hover:text-primary-600 sm:px-20 ${inactiveClasses}`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-3 w-3 rounded-full ${status} mb-0.5 cursor-help`}
                      title={statusTitle}
                    ></div>
                    <p>
                      {s.lastName} {s.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
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
          })
        )}
      </ul>
    </div>
  );
};

const Students = () => {
  // usePopulateFakeStudents(100);
  const utils = trpc.proxy.useContext();
  const { isLoading: isDeleting, mutateAsync: deleteStudent } =
    trpc.proxy.students.delete.useMutation({
      onSuccess: () => {
        utils.students.allSearch.invalidate();
      },
    });
  const {
    handleFinished,
    handleDelete,
    handleEdit,
    handleCreate,
    currentId,
    showCreateEdit,
    showDeleteConfirm,
  } = useCRUDState();

  const handleSubmitDelete = async () => {
    await deleteStudent({ id: currentId });
    handleFinished();
  };

  return (
    <section className="flex w-11/12 flex-grow flex-col items-center gap-3 rounded-lg p-4 sm:max-w-2xl">
      <button
        onClick={handleCreate}
        type="button"
        className="w-full rounded-lg bg-primary-800 p-3 text-white hover:bg-primary-400"
      >
        Agregar alumno
      </button>
      {showCreateEdit ? (
        <Modal
          onBackdropClick={handleFinished}
          className="w-full bg-white drop-shadow-2xl md:w-auto"
        >
          <StudentForm onFinished={handleFinished} studentId={currentId} />
        </Modal>
      ) : null}
      <StudentList handleDelete={handleDelete} handleEdit={handleEdit} />
      {showDeleteConfirm ? (
        <Modal
          onBackdropClick={handleFinished}
          className="w-full bg-white drop-shadow-2xl md:w-auto"
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
export default Students;
