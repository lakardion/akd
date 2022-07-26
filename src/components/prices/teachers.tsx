import { useAutoAnimate } from '@formkit/auto-animate/react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AddHourRateFormInput,
  addHourRateFormZod,
  AddHourRateInput,
} from 'common';
import { Button, PillButton } from 'components/button';
import { ConfirmForm } from 'components/confirm-form';
import { Input } from 'components/form/input';
import { ValidationError } from 'components/form/validation-error';
import { Modal } from 'components/modal';
import { Spinner } from 'components/spinner';
import { FC, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { MdDelete, MdEdit } from 'react-icons/md';
import { trpc } from 'utils/trpc';

const useHourRateForm = ({ id }: { id: string }) => {
  const { data: hourRate } = trpc.rates.hourRate.useQuery(
    { id },
    {
      enabled: Boolean(id),
    }
  );
  const defaultValues: AddHourRateFormInput = useMemo(() => {
    return {
      description: hourRate?.description ?? '',
      rate: hourRate?.rate?.toString() ?? '',
    };
  }, [hourRate?.description, hourRate?.rate]);
  const form = useForm<AddHourRateFormInput>({
    resolver: zodResolver(addHourRateFormZod),
    defaultValues,
  });
  const stableFormReset = useMemo(() => {
    return form.reset;
  }, [form.reset]);

  useEffect(() => {
    stableFormReset(defaultValues);
  }, [stableFormReset, defaultValues]);

  return form;
};

const TeacherHourRateList: FC<{
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}> = ({ onEdit, onDelete }) => {
  const { data, isLoading } = trpc.rates.hourRates.useQuery({
    type: 'TEACHER',
  });

  const [parent] = useAutoAnimate<HTMLUListElement>();

  if (isLoading) {
    return (
      <div className="flex w-full justify-center">
        <Spinner size="sm" />
      </div>
    );
  }
  const createEditHandler = (id: string) => () => {
    onEdit(id);
  };
  const createDeleteHandler = (id: string) => () => {
    onDelete(id);
  };

  return (
    <ul ref={parent}>
      {data?.map((sp) => (
        <li key={sp.id} className="flex justify-between gap-3">
          <div>{sp.description}</div>
          <div>
            <div>{sp.rate}</div>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={createEditHandler(sp.id)}>
              <MdEdit
                size={20}
                className="fill-blackish-900 hover:fill-primary-400"
              />
            </button>
            <button type="button" onClick={createDeleteHandler(sp.id)}>
              <MdDelete
                size={20}
                className="fill-blackish-900 hover:fill-primary-400"
              />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
};

const AddHourRateForm: FC<{ onFinished: () => void; id: string }> = ({
  onFinished,
  id,
}) => {
  const queryClient = trpc.useContext();
  const utils = trpc.useContext();
  const { isLoading: isCreating, mutateAsync: create } =
    trpc.rates.createHourRate.useMutation({
      onSuccess: () => {
        utils.rates.hourRates.invalidate({ type: 'TEACHER' });
      },
    });
  const { isLoading: isEditing, mutateAsync: edit } =
    trpc.rates.editHourRate.useMutation({
      onSuccess: () => {
        utils.rates.hourRates.invalidate({ type: 'TEACHER' });
      },
    });

  const {
    handleSubmit,
    register,
    formState: { errors },
  } = useHourRateForm({ id });

  const onSubmit = async (data: AddHourRateFormInput) => {
    const parsedData: AddHourRateInput = {
      description: data.description,
      rate: parseFloat(data.rate),
    };
    const result = id
      ? await edit({ id, ...parsedData, type: 'TEACHER' })
      : await create({ ...parsedData, type: 'TEACHER' });

    onFinished();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <h1 className="text-3xl font-medium">Agregar precio de horas</h1>
      <section className="flex flex-col gap-2">
        <label htmlFor="rate">Valor</label>
        <Input
          {...register('rate')}
          type="number"
          className="text-black"
          placeholder="Valor..."
        />
        <ValidationError errorMessages={errors.description?.message} />
        <label htmlFor="description">Nombre descriptivo</label>
        <Input
          {...register('description')}
          className="text-black"
          placeholder="Descripción..."
        />
        <ValidationError errorMessages={errors.rate?.message} />
      </section>
      <section className="flex gap-3">
        <PillButton type="submit" className="flex-grow" variant="accent">
          Agregar
        </PillButton>
        <PillButton
          type="button"
          onClick={onFinished}
          className="flex-grow"
          variant="accent"
        >
          Cancelar
        </PillButton>
      </section>
    </form>
  );
};

const TeacherHourRatePrices = () => {
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [currentId, setCurrentId] = useState('');
  const [showCreateEditModal, setShowCreateEditModal] = useState(false);
  const utils = trpc.useContext();
  const queryClient = trpc.useContext();
  const {
    isLoading: isDeleting,
    error: deleteError,
    mutateAsync: deleteOne,
  } = trpc.rates.deleteHourRate.useMutation({
    onSuccess: () => {
      utils.rates.hourRates.invalidate();
    },
  });

  const handleOpenCreateEdit = () => {
    setShowCreateEditModal(true);
  };
  const handleCloseCreateEditModal = () => {
    setShowCreateEditModal(false);
    setCurrentId('');
  };
  const handleEdit = (id: string) => {
    setCurrentId(id);
    setShowCreateEditModal(true);
  };
  const handleCloseConfirmDeleteModal = () => {
    setShowConfirmDeleteModal(false);
    setCurrentId('');
  };
  const handleDelete = (id: string) => {
    setCurrentId(id);
    setShowConfirmDeleteModal(true);
  };
  const handleSubmitDelete = async () => {
    await deleteOne({ id: currentId });
    setCurrentId('');
    setShowConfirmDeleteModal(false);
  };

  return (
    <section className="flex-grow p-3">
      <div className="rounded-lg bg-accent-100 p-3 shadow-lg">
        <h1 className="text-center text-2xl">Precios de horas</h1>
        <div className="py-2">
          <PillButton onClick={handleOpenCreateEdit}>Agregar</PillButton>
        </div>
        <TeacherHourRateList onEdit={handleEdit} onDelete={handleDelete} />
        {showCreateEditModal ? (
          <Modal
            onBackdropClick={handleCloseCreateEditModal}
            className="w-full bg-white drop-shadow-2xl md:w-auto md:min-w-[400px]"
          >
            <AddHourRateForm
              onFinished={handleCloseCreateEditModal}
              id={currentId}
            />
          </Modal>
        ) : null}
        {showConfirmDeleteModal ? (
          <Modal
            onBackdropClick={handleCloseConfirmDeleteModal}
            className="w-full bg-white drop-shadow-2xl md:w-auto md:min-w-[400px]"
          >
            <ConfirmForm
              title="Estás seguro/a?"
              body="Confirmar la eliminación del precio de hora"
              onCancel={handleCloseConfirmDeleteModal}
              onConfirm={handleSubmitDelete}
              isConfirming={isDeleting}
              errorMessage={deleteError?.message}
            />
          </Modal>
        ) : null}
      </div>
    </section>
  );
};

export const TeacherHourRates = () => {
  return (
    <main className="flex gap-5">
      <TeacherHourRatePrices />
    </main>
  );
};
