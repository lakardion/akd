import { Button, PillButton } from 'components/button';
import { ConfirmForm } from 'components/confirm-form';
import { Modal } from 'components/modal';
import { useState } from 'react';
import { trpc } from 'utils/trpc';
import { FaBiohazard } from 'react-icons/fa';

const Admin = () => {
  const { mutateAsync, isLoading } = trpc.admin.nukeDatabase.useMutation();
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const handleCloseModal = () => {
    setShowConfirmDeleteModal(false);
  };
  const handleOpenModal = () => {
    setShowConfirmDeleteModal(true);
  };
  const handleConfirmNuke = async () => {
    await mutateAsync();
    window.location.reload();
  };

  return (
    <section className="flex h-full w-full max-w-md items-center justify-center">
      <PillButton onClick={handleOpenModal}>Nuke DB</PillButton>

      {showConfirmDeleteModal ? (
        <Modal
          onBackdropClick={handleCloseModal}
          className="w-full bg-white drop-shadow-2xl md:w-auto md:min-w-[400px]"
        >
          <ConfirmForm
            title="Estás seguro/a?"
            body={
              <section className="flex flex-col items-center justify-center gap-2 px-2 py-4">
                <FaBiohazard size={200} className="fill-primary" />
                <h1 className="text-2xl text-primary-600">
                  Estás a punto de borrar toda la información de la aplicación
                </h1>
              </section>
            }
            onCancel={handleCloseModal}
            onConfirm={handleConfirmNuke}
            isConfirming={isLoading}
          />
        </Modal>
      ) : null}
    </section>
  );
};
export default Admin;
