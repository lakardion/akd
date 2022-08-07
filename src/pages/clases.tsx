import { useAutoAnimate } from '@formkit/auto-animate/react';
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
            const status = s.date < new Date() ? 'opacity-60' : '';
            return (
              <li
                key={s.id}
                className={`bg-gray-300 w-full rounded-md py-3 px-2 sm:px-20 flex justify-between items-center ${status}`}
              >
                <div className="flex items-center gap-2">
                  <p>{format(s.date, 'dd-MM-yyyy H:mm')}</p>
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
    trpc.useQuery(['teachers.count']);
  const { data: teacherRates, isLoading: isHourRatesLoading } = trpc.useQuery([
    'rates.hourRates',
    { type: 'TEACHER' },
  ]);
  const { isLoading: isClassSessionLoading } = trpc.useQuery(
    ['classSessions.single', { id: currentId }],
    { enabled: Boolean(currentId) }
  );
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
              No se pueden cargar clases a menos que haya{' '}
              <Link href="/profesores">
                <span className="text-blue-600 hover:underline hover:cursor-pointer">
                  profesores
                </span>
              </Link>{' '}
              y{' '}
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
