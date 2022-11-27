import { useAutoAnimate } from '@formkit/auto-animate/react';
import { disabledBtnClasses } from 'components/button';
import { ClassSessionForm } from 'components/class-sessions/form';
import { ConfirmForm } from 'components/confirm-form';
import { Modal } from 'components/modal';
import { Spinner } from 'components/spinner';
import { WarningMessage } from 'components/warning-message';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useCRUDState } from 'hooks';
import Link from 'next/link';
import { FC, MouseEvent, UIEventHandler, useMemo } from 'react';
import { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { MdDelete, MdEdit } from 'react-icons/md';
import { trpc } from 'utils/trpc';

registerLocale('es', es);

const ClassSessionList: FC<{
  handleDelete: (id: string) => void;
  handleEdit: (id: string) => void;
}> = ({ handleDelete, handleEdit }) => {
  const { data, fetchNextPage, hasNextPage, isLoading, isFetching } =
    trpc.useInfiniteQuery(['classSessions.all', {}], {
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
        className="flex w-full flex-col items-center gap-3 overflow-auto md:max-h-[700px]"
        ref={parent}
        onScroll={watchScroll}
      >
        {isLoading ? (
          <Spinner size="sm" />
        ) : !flatData.length ? (
          <p>No hay clases para mostrar</p>
        ) : (
          flatData.map((s) => {
            const status = s.date < new Date() ? 'opacity-60' : '';
            return (
              <li
                key={s.id}
                className={`flex w-full items-center justify-between rounded-md bg-gray-300 py-3 px-2 sm:px-20 ${status}`}
              >
                <div className="flex items-center gap-2">
                  <p>{format(s.date, 'dd-MM-yyyy H:mm')}</p>
                  <p>
                    {s.teacher?.name} {s.teacher?.lastName}
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
    trpc.proxy.teachers.count.useQuery();
  const { data: teacherRates, isLoading: isHourRatesLoading } =
    trpc.proxy.rates.hourRates.useQuery({ type: 'TEACHER' });
  const { isLoading } = trpc.useInfiniteQuery(['classSessions.all', {}], {
    getNextPageParam: (lastPage) => {
      return lastPage.nextCursor ? { page: lastPage.nextCursor } : null;
    },
    keepPreviousData: true,
  });

  const queryClient = trpc.useContext();
  const { mutateAsync: deleteOne, isLoading: isDeleting } = trpc.useMutation(
    'classSessions.delete',
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['classSessions.all']);
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
      <section className="flex w-full items-center justify-center">
        <Spinner size="md" />
      </section>
    );
  }

  return (
    <section className="flex w-11/12 flex-col items-center gap-3 rounded-lg p-4 sm:max-w-2xl">
      {!canCreate ? (
        <section aria-label="warning" className="w-full">
          <WarningMessage>
            <p className="italic">
              No se pueden cargar clases a menos que haya{' '}
              <Link href="/profesores">
                <span className="text-blue-600 hover:cursor-pointer hover:underline">
                  profesores
                </span>
              </Link>{' '}
              y{' '}
              <Link href="/precios/profesores">
                <span className="text-blue-600 hover:cursor-pointer hover:underline">
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
        className={`${disabledBtnClasses} w-full rounded-lg bg-primary-800 p-3 text-white hover:bg-primary-400`}
        disabled={!canCreate}
      >
        Agregar clase
      </button>
      <ClassSessionList handleDelete={handleDelete} handleEdit={handleEdit} />
      {showCreateEdit ? (
        <Modal
          onBackdropClick={handleFinished}
          className="w-full bg-white drop-shadow-2xl md:w-auto md:min-w-[400px]"
        >
          <ClassSessionForm onFinished={handleFinished} id={currentId} />
        </Modal>
      ) : null}
      {showDeleteConfirm ? (
        <Modal
          onBackdropClick={handleFinished}
          className="w-full bg-white drop-shadow-2xl md:w-auto"
        >
          <ConfirmForm
            onCancel={handleFinished}
            body={
              <div className="flex flex-col gap-3">
                <WarningMessage>
                  Si eliminás la clase, los alumnos que forman parte de ella
                  recibirán sus horas de vuelta
                </WarningMessage>
                <p>Confirma que deseás eliminar la clase</p>
              </div>
            }
            isConfirming={isDeleting}
            onConfirm={handleSubmitDelete}
          />
        </Modal>
      ) : null}
    </section>
  );
};

export default ClassSessions;
