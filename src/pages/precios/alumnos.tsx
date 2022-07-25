import { zodResolver } from "@hookform/resolvers/zod";
import {
  AddHourPackageFormInput,
  addHourPackageFormZod,
  AddHourPackageInput,
  AddHourRateFormInput,
  addHourRateFormZod,
  AddHourRateInput,
} from "common";
import { Button } from "components/button";
import { ConfirmForm } from "components/confirm-form";
import { Input } from "components/form/input";
import { ValidationError } from "components/form/validation-error";
import { Modal } from "components/modal";
import { Spinner } from "components/spinner";
import { FC, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { trpc } from "utils/trpc";

const useHourRateForm = ({ id }: { id: string }) => {
  const { data: hourRate } = trpc.useQuery(["rates.hourRate", { id }], {
    enabled: Boolean(id),
  });
  const defaultValues: AddHourRateFormInput = useMemo(() => {
    return {
      description: hourRate?.description ?? "",
      rate: hourRate?.rate?.toString() ?? "",
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

const useHourPackageForm = ({ id }: { id: string }) => {
  const { data: hourPackage } = trpc.useQuery(["rates.hourPackage", { id }], {
    enabled: Boolean(id),
  });
  const defaultValues: AddHourPackageFormInput = useMemo(
    () => ({
      description: hourPackage?.description ?? "",
      packHours: hourPackage?.packHours?.toString() ?? "",
      totalValue: hourPackage?.totalValue?.toString() ?? "",
    }),
    [hourPackage]
  );
  const form = useForm<AddHourPackageFormInput>({
    resolver: zodResolver(addHourPackageFormZod),
    defaultValues,
  });
  const stableFormReset = useMemo(() => {
    return form.reset;
  }, [form.reset]);
  useEffect(() => {
    stableFormReset(defaultValues);
  }, [defaultValues, stableFormReset]);

  return form;
};

const StudentHourRateList: FC<{
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}> = ({ onEdit, onDelete }) => {
  const { data, isLoading } = trpc.useQuery([
    "rates.hourRates",
    { type: "STUDENT" },
  ]);

  if (!data) {
    return <Spinner size="sm" />;
  }
  const createEditHandler = (id: string) => () => {
    onEdit(id);
  };
  const createDeleteHandler = (id: string) => () => {
    onDelete(id);
  };

  return (
    <ul>
      {data?.map((sp) => (
        <li key={sp.id} className="flex gap-3 justify-between">
          <div>{sp.description}</div>
          <div>
            <div>{sp.rate}</div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={createEditHandler(sp.id)}>
              Editar
            </button>
            <button type="button" onClick={createDeleteHandler(sp.id)}>
              Eliminar
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
};

const PackagePriceList: FC<{
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}> = ({ onEdit, onDelete }) => {
  const { data, isLoading } = trpc.useQuery(["rates.hourPackages"]);
  if (!data) {
    return <Spinner size="sm" />;
  }
  const createEditHandler = (id: string) => () => {
    onEdit(id);
  };
  const createDeleteHandler = (id: string) => () => {
    onDelete(id);
  };
  return (
    <ul>
      {data.map((d) => (
        <li key={d.id} className="flex gap-3 justify-between">
          <div>{d.description}</div>
          {/* todo: add flex basis to keep consistency */}
          <div className="flex gap-2">
            <div>{d.packHours} hs</div>
            <div>$ {d.totalValue}</div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={createEditHandler(d.id)}>
              Editar
            </button>
            <button type="button" onClick={createDeleteHandler(d.id)}>
              Eliminar
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
  const { isLoading: isCreating, mutateAsync: create } = trpc.useMutation(
    "rates.createHourRate",
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["rates.hourRates", { type: "STUDENT" }]);
      },
    }
  );
  const { isLoading: isEditing, mutateAsync: edit } = trpc.useMutation(
    "rates.editHourRate",
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["rates.hourRates", { type: "STUDENT" }]);
      },
    }
  );

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
      ? await edit({ id, ...parsedData, type: "STUDENT" })
      : await create({ ...parsedData, type: "STUDENT" });

    onFinished();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <h1 className="font-medium text-3xl">Agregar precio de horas</h1>
      <section className="flex flex-col gap-2">
        <label htmlFor="rate">Valor</label>
        <Input
          {...register("rate")}
          type="number"
          className="text-black"
          placeholder="Valor..."
        />
        <ValidationError error={errors.rate} />
        <label htmlFor="description">Nombre descriptivo</label>
        <Input
          {...register("description")}
          className="text-black"
          placeholder="Descripción..."
        />
        <ValidationError error={errors.description} />
      </section>
      <section className="flex">
        <Button type="submit" className="flex-grow">
          Agregar
        </Button>
        <Button type="button" onClick={onFinished} className="flex-grow">
          Cancelar
        </Button>
      </section>
    </form>
  );
};

const AddHourPackageForm: FC<{ onFinished: () => void; id: string }> = ({
  onFinished,
  id,
}) => {
  const queryClient = trpc.useContext();
  const { isLoading: isCreating, mutateAsync: create } = trpc.useMutation(
    "rates.createHourPackage",
    {
      onSuccess: () => {
        queryClient.invalidateQueries("rates.hourPackages");
      },
    }
  );
  const { isLoading: isEditing, mutateAsync: edit } = trpc.useMutation(
    "rates.editHourPackage",
    {
      onSuccess: () => {
        queryClient.invalidateQueries("rates.hourPackages");
      },
    }
  );
  const {
    handleSubmit,
    register,
    formState: { errors },
    reset,
  } = useHourPackageForm({ id });

  const onSubmit = async (data: AddHourPackageFormInput) => {
    const parsedData: AddHourPackageInput = {
      description: data.description,
      packHours: parseFloat(data.packHours),
      totalValue: parseFloat(data.totalValue),
    };
    const result = id
      ? await edit({ id, ...parsedData })
      : await create({ ...parsedData });

    onFinished();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <h1 className="font-medium text-3xl">
        {id ? "Editar paquete de horas" : "Agregar paquete de horas"}
      </h1>
      <section className="flex flex-col gap-2">
        <label htmlFor="packHours">Horas en paquete</label>
        <Input
          {...register("packHours")}
          type="number"
          className="text-black"
          placeholder="Horas en paquete..."
        />
        <ValidationError error={errors.packHours} />
        <label htmlFor="totalValue">Valor del paquete</label>
        <Input
          {...register("totalValue")}
          type="number"
          className="text-black"
          placeholder="Valor del paquete..."
        />
        <ValidationError error={errors.totalValue} />
        <label htmlFor="description">Nombre descriptivo</label>
        <Input
          {...register("description")}
          className="text-black"
          placeholder="Descripción..."
        />
        <ValidationError error={errors.description} />
      </section>
      <section className="flex gap-3">
        <Button
          type="submit"
          className="flex-grow"
          isLoading={isCreating || isEditing}
        >
          {id ? "Editar" : "Agregar"}
        </Button>
        <Button type="button" onClick={onFinished} className="flex-grow">
          Cancelar
        </Button>
      </section>
    </form>
  );
};

const StudentHourRatePrices = () => {
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [currentId, setCurrentId] = useState("");
  const [showCreateEditModal, setShowCreateEditModal] = useState(false);
  const queryClient = trpc.useContext();
  const {
    isLoading: isDeleting,
    error: deleteError,
    mutateAsync: deleteOne,
  } = trpc.useMutation("rates.deleteHourRate", {
    onSuccess: () => {
      queryClient.invalidateQueries("rates.hourRates");
    },
  });

  const handleOpenCreateEdit = () => {
    setShowCreateEditModal(true);
  };
  const handleCloseCreateEditModal = () => {
    setShowCreateEditModal(false);
    setCurrentId("");
  };
  const handleEdit = (id: string) => {
    setCurrentId(id);
    setShowCreateEditModal(true);
  };
  const handleCloseConfirmDeleteModal = () => {
    setShowConfirmDeleteModal(false);
    setCurrentId("");
  };
  const handleDelete = (id: string) => {
    setCurrentId(id);
    setShowConfirmDeleteModal(true);
  };
  const handleSubmitDelete = async () => {
    await deleteOne({ id: currentId });
    setCurrentId("");
    setShowConfirmDeleteModal(false);
  };

  return (
    <section>
      <h1>Precios de horas</h1>
      <button onClick={handleOpenCreateEdit}>Agregar</button>
      <StudentHourRateList onEdit={handleEdit} onDelete={handleDelete} />
      {showCreateEditModal ? (
        <Modal onBackdropClick={handleCloseCreateEditModal}>
          <AddHourRateForm
            onFinished={handleCloseCreateEditModal}
            id={currentId}
          />
        </Modal>
      ) : null}
      {showConfirmDeleteModal ? (
        <Modal onBackdropClick={handleCloseConfirmDeleteModal}>
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
    </section>
  );
};

const StudentPackagePrices = () => {
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [currentId, setCurrentId] = useState("");
  const [showCreateEditModal, setShowCreateEditModal] = useState(false);
  const queryClient = trpc.useContext();
  const {
    isLoading: isDeleting,
    error: deleteError,
    mutateAsync: deleteOne,
  } = trpc.useMutation("rates.deleteHourPackage", {
    onSuccess: () => {
      queryClient.invalidateQueries("rates.hourPackages");
    },
  });

  const handleOpenCreateEdit = () => {
    setShowCreateEditModal(true);
  };
  const handleCloseCreateEditModal = () => {
    setShowCreateEditModal(false);
  };
  const handlePackageEdit = (id: string) => {
    setCurrentId(id);
    setShowCreateEditModal(true);
  };
  const handleCloseConfirmDeleteModal = () => {
    setShowConfirmDeleteModal(false);
    setCurrentId("");
  };
  const handleDelete = (id: string) => {
    setCurrentId(id);
    setShowConfirmDeleteModal(true);
  };
  const handleSubmitDelete = async () => {
    await deleteOne({ id: currentId });
    setCurrentId("");
    setShowConfirmDeleteModal(false);
  };

  return (
    <section>
      <h1>Precios de paquetes</h1>
      <button onClick={handleOpenCreateEdit}>Agregar</button>
      <PackagePriceList onEdit={handlePackageEdit} onDelete={handleDelete} />
      {showCreateEditModal ? (
        <Modal onBackdropClick={handleCloseCreateEditModal}>
          <AddHourPackageForm
            onFinished={handleCloseCreateEditModal}
            id={currentId}
          />
        </Modal>
      ) : null}
      {showConfirmDeleteModal ? (
        <Modal onBackdropClick={handleCloseConfirmDeleteModal}>
          <ConfirmForm
            title="Estás seguro/a?"
            body="Confirmar la eliminación del paquete de horas"
            onCancel={handleCloseConfirmDeleteModal}
            onConfirm={handleSubmitDelete}
            isConfirming={isDeleting}
            errorMessage={deleteError?.message}
          />
        </Modal>
      ) : null}
    </section>
  );
};

const StudentHourRates = () => {
  return (
    <main className="flex gap-5">
      <StudentHourRatePrices />
      <StudentPackagePrices />
    </main>
  );
};
export default StudentHourRates;
