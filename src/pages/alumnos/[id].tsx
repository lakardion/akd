import { PillButton } from 'components/button';
import { Modal } from 'components/modal';
import {
  PaymentForm,
  StudentAttachToClassSessionForm,
} from 'components/students';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/router';
import { FC, useMemo, useState } from 'react';
import ReactDatePicker from 'react-datepicker';
import { iconByPaymentType } from 'utils/payments';
import { trpc } from 'utils/trpc';

const StudentHistory: FC<{ month: string; studentId: string }> = ({
  month,
  studentId,
}) => {
  const { data: history, isLoading } = trpc.useQuery([
    'students.history',
    { month, studentId },
  ]);
  return (
    <section
      aria-label="class and payment history"
      className="w-full flex flex-col gap-3"
    >
      {!history?.length ? (
        <p className="text-center italic">No hay registros para este mes</p>
      ) : null}
      {history?.map((h) => {
        if ('payment' in h) {
          const Icon = iconByPaymentType[h.payment.type];
          return (
            <section
              className="relative w-full flex gap-3 p-2 px-6 bg-teal-100/50 text-black rounded-lg justify-between items-center"
              key={h.payment.id}
            >
              <div className="flex flex-col gap-2">
                <h1 className="font-bold">Pago</h1>
                <p>{format(h.date, 'dd-MM-yy')}</p>
              </div>
              <div className="text-3xl">{h.payment.hours} hs</div>
              <div className="text-2xl self-end">$ {h.payment.amount}</div>
              <div className="absolute top-0 right-4 p-2">
                <Icon size={20} />
              </div>
            </section>
          );
        } else {
          return (
            <section
              className="relative w-full flex gap-3 p-2 px-6 bg-primary-100/50 text-black rounded-lg justify-between items-center"
              key={h.classSession.id}
            >
              <div className="flex flex-col gap-2">
                <h1 className="font-bold">Clase</h1>
                <p>{format(h.date, 'dd-MM-yy')}</p>
              </div>
              <div className="text-xl self-center">
                {h.classSession.teacherFullName}
              </div>
              <p className="text-2xl">{h.classSession.hours} hs</p>
            </section>
          );
        }
      })}
    </section>
  );
};

type StudentStatus = 'OWES' | 'NO_HOURS' | 'HAS_HOURS';

const colorByStatus: Record<StudentStatus, string> = {
  HAS_HOURS: 'green-500',
  NO_HOURS: 'gray-500',
  OWES: 'red-500',
};

const getPhraseByStatus = (
  hours: number,
  debt: number,
  status: StudentStatus
) => {
  const plural = hours === 1 ? '' : 's';
  switch (status) {
    case 'HAS_HOURS':
      return `( Tiene ${hours} hora${plural} disponible${plural} )`;
    case 'NO_HOURS':
      return '( No tiene horas disponibles )';
    case 'OWES':
      return `( Debe $${debt} )`;
  }
};

const getStatus = (hours: number, debt: number) => {
  const value: StudentStatus =
    debt > 0 ? 'OWES' : hours === 0 ? 'NO_HOURS' : 'HAS_HOURS';
  const color = colorByStatus[value];
  const statusMessage = getPhraseByStatus(hours, debt, value);
  return { value, color, statusMessage };
};

const StudentDetail = () => {
  const [showPaymentmodal, setShowPaymentmodal] = useState(false);
  const [showClassSessionModal, setShowClassSessionModal] = useState(false);
  const {
    query: { id },
  } = useRouter();
  const [month, setMonth] = useState(new Date());
  const parsedMonth = useMemo(() => {
    return format(month, 'yy-MM');
  }, [month]);

  const stableId = useMemo(() => {
    return typeof id === 'string' ? id : '';
  }, [id]);

  const { data } = trpc.useQuery(['students.single', { id: stableId }], {
    enabled: Boolean(id),
  });
  const status = getStatus(data?.hourBalance ?? 0, data?.debts ?? 0);

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

  const handleMonthChange = (date: Date) => {
    setMonth(date);
  };

  // Had to memoize this because it was causing some crazy rerenders on the preloaded student in form
  const currentStudentInfo = useMemo(
    () => ({
      value: data?.id ?? '',
      label: `${data?.name} ${data?.lastName}`,
    }),
    []
  );

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
        <section className="flex gap-3 py-4 items-center justify-center w-full">
          <div>
            <label>Mes</label>
          </div>
          <ReactDatePicker
            selected={month}
            onChange={handleMonthChange}
            dateFormat="MMMM-yy"
            showMonthYearPicker
            locale={es}
            className="bg-primary-300/50 p-2 rounded-lg w-full text-center"
            wrapperClassName="max-w-[150px] flex justify-center items-center"
          />
        </section>
        <StudentHistory month={parsedMonth} studentId={stableId} />
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
          className="w-[90%] md:w-[60%] max-w-[500px] bg-white drop-shadow-2xl"
        >
          {data ? (
            <StudentAttachToClassSessionForm
              studentInfo={currentStudentInfo}
              onFinished={handleCloseClassSessionModal}
            />
          ) : null}
        </Modal>
      ) : null}
    </section>
  );
};
export default StudentDetail;
