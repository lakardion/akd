import { PillButton } from 'components/button';
import { ClassSessionForm } from 'components/class-sessions/form';
import { Modal } from 'components/modal';
import {
  ClassSessionTable,
  PaymentTable,
  TeacherPaymentForm,
} from 'components/teachers';
import { useRouter } from 'next/router';
import { useMemo, useState } from 'react';
import { trpc } from 'utils/trpc';

const activeViewClass = 'bg-primary-700 text-white';

const getBalanceStyle = (balance?: number) => {
  if (balance === undefined) return '';
  if (balance === 0) return 'text-gray-500';
  if (balance > 0) return 'text-red-500';
};

const TeacherDetail = () => {
  const [showPaymentmodal, setShowPaymentmodal] = useState(false);
  const [showClassSessionModal, setShowClassSessionModal] = useState(false);
  const [activeView, setActiveView] = useState<'payments' | 'classes'>(
    'payments'
  );
  const {
    query: { id },
  } = useRouter();

  const stableId = useMemo(() => {
    return typeof id === 'string' ? id : '';
  }, [id]);

  const { data } = trpc.useQuery(['teachers.single', { id: stableId }], {
    enabled: Boolean(id),
  });

  const handleSetPaymentActiveView = () => {
    setActiveView('payments');
  };
  const handleSetClassesActiveView = () => {
    setActiveView('classes');
  };
  const handleShowPaymentModal = () => {
    setShowPaymentmodal(true);
  };
  const handleClosePaymentModal = () => {
    setShowPaymentmodal(false);
  };
  const handleCloseClassSessionModal = () => {
    setShowClassSessionModal(false);
  };
  const handleShowClassSessionModal = () => {
    setShowClassSessionModal(true);
  };

  if (!id)
    return (
      <section>
        <h1 className="text-3xl">Profesor no encontrado</h1>
      </section>
    );

  return (
    <section className="flex flex-col gap-3 items-center p-3  w-full sm:max-w-[550px]">
      <h1 className="text-3xl">
        {data?.name} {data?.lastName}
      </h1>
      <h2 className="text-2xl font-medium text-center w-full">
        <span className={getBalanceStyle(data?.balance)}>
          $ {data?.balance}
        </span>
      </h2>
      <section
        aria-label="action buttons"
        className="flex flex-col w-full gap-2"
      >
        <PillButton onClick={handleShowPaymentModal}>Cargar pago</PillButton>
        <PillButton onClick={handleShowClassSessionModal}>
          Cargar clase
        </PillButton>
      </section>
      <section
        aria-label="class and payment history"
        className="w-full flex flex-col gap-3"
      >
        <header className="w-full flex rounded-r-full rounded-l-full border border-solid border-blackish-600 bg-blackish-300 justify-center items-center text-blackish-800/80 hover:cursor-pointer">
          <div
            className={`flex-grow text-center rounded-l-full transition-colors ease-in-out delay-150 ${
              activeView === 'payments'
                ? activeViewClass
                : 'hover:bg-primary-400 hover:text-white'
            }`}
            onClick={handleSetPaymentActiveView}
          >
            Pagos
          </div>
          <div
            className={`flex-grow text-center rounded-r-full transition-colors ease-in-out delay-150 ${
              activeView === 'classes'
                ? activeViewClass
                : 'hover:bg-primary-400 hover:text-white'
            }`}
            onClick={handleSetClassesActiveView}
          >
            Clases
          </div>
        </header>
        {activeView === 'payments' ? (
          <PaymentTable studentId={stableId} />
        ) : (
          <ClassSessionTable teacherId={stableId} />
        )}
      </section>
      {showPaymentmodal ? (
        <Modal
          onBackdropClick={handleClosePaymentModal}
          className="w-full md:w-auto bg-white drop-shadow-2xl"
        >
          <TeacherPaymentForm
            teacherId={stableId}
            onFinished={handleClosePaymentModal}
          />
        </Modal>
      ) : null}
      {showClassSessionModal ? (
        <Modal
          onBackdropClick={handleCloseClassSessionModal}
          className="w-[90%] md:w-[60%] max-w-[500px] bg-white drop-shadow-2xl"
        >
          {data ? (
            <ClassSessionForm
              id=""
              onFinished={handleCloseClassSessionModal}
              preloadTeacher={{
                value: data.id ?? '',
                label: `${data.name} ${data.lastName}`,
              }}
            />
          ) : null}
        </Modal>
      ) : null}
    </section>
  );
};

export default TeacherDetail;
