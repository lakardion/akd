import { PillButton } from 'components/button';
import { Modal } from 'components/modal';
import {
  ClassSessionForm,
  ClassSessionTable,
  PaymentForm,
  PaymentTable,
} from 'components/students';
import { useRouter } from 'next/router';
import { useMemo, useState } from 'react';
import { trpc } from 'utils/trpc';

const activeViewClass = 'bg-primary-700 text-white';
type StudentStatus = 'OWES' | 'NO_HOURS' | 'HAS_HOURS';

const colorByStatus: Record<StudentStatus, string> = {
  HAS_HOURS: 'green-500',
  NO_HOURS: 'gray-500',
  OWES: 'red-500',
};

const getPhraseByStatus = (hours: number, status: StudentStatus) => {
  const plural = hours === 1 ? '' : 's';
  switch (status) {
    case 'HAS_HOURS':
      return `( Tiene ${hours} hora${plural} disponible${plural} )`;
    case 'NO_HOURS':
      return '( No tiene horas disponibles )';
    case 'OWES':
      return `( Debe ${hours} hora${plural} )`;
  }
};

const getStatus = (hours: number) => {
  const value: StudentStatus =
    hours < 0 ? 'OWES' : hours === 0 ? 'NO_HOURS' : 'HAS_HOURS';
  const color = colorByStatus[value];
  const statusMessage = getPhraseByStatus(hours, value);
  return { value, color, statusMessage };
};

const StudentDetail = () => {
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

  const { data } = trpc.useQuery(['students.single', { id: stableId }], {
    enabled: Boolean(id),
  });
  const status = getStatus(data?.hourBalance ?? 0);

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
        <h1 className="text-3xl">Alumno no encontrado</h1>
      </section>
    );

  return (
    <section className="flex flex-col gap-3 items-center p-3  w-full sm:max-w-[550px]">
      <h1 className="text-3xl">
        {data?.name} {data?.lastName}
      </h1>
      <h2 className={`text-xl text-${status.color}`}>{status.statusMessage}</h2>
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
          <ClassSessionTable studentId={stableId} />
        )}
      </section>
      {showPaymentmodal ? (
        <Modal
          onBackdropClick={handleClosePaymentModal}
          className="w-full md:w-auto bg-white drop-shadow-2xl"
        >
          <PaymentForm
            studentId={stableId}
            onFinished={handleClosePaymentModal}
          />
        </Modal>
      ) : null}
      {showClassSessionModal ? (
        <Modal
          onBackdropClick={handleCloseClassSessionModal}
          className="w-full md:w-auto bg-white drop-shadow-2xl"
        >
          <ClassSessionForm onFinished={handleCloseClassSessionModal} />
        </Modal>
      ) : null}
    </section>
  );
};
export default StudentDetail;
