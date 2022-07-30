import { useAutoAnimate } from "@formkit/auto-animate/react";
import { ConfirmForm } from "components/confirm-form";
import { Modal } from "components/modal";
import { Spinner } from "components/spinner";
import { format } from "date-fns";
import { useCRUDState } from "hooks";
import { useRouter } from "next/router";
import {
  FC,
  MouseEvent,
  UIEventHandler,
  useCallback,
  useMemo,
  useState,
} from "react";
import { MdDelete, MdEdit } from "react-icons/md";
import { trpc } from "utils/trpc";

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

  return (
    <section className="p-4 rounded-lg w-11/12 sm:max-w-2xl flex flex-col gap-3 items-center">
      <button
        onClick={handleCreate}
        type="button"
        className="rounded-lg bg-primary-800 w-full p-3 text-white hover:bg-primary-400"
      >
        Agregar clase
      </button>
      <ClassSessionList handleDelete={handleDelete} handleEdit={handleEdit} />
      {showCreateEdit ? (
        <Modal
          onBackdropClick={handleFinished}
          className="w-full md:w-auto bg-white drop-shadow-2xl"
        >
          {/* <StudentForm onFinished={handleFinished} studentId={currentId} /> */}
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
