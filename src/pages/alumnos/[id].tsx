import { PillButton } from 'components/button';
import { Modal } from 'components/modal';
import {
  PaymentForm,
  StudentAttachToClassSessionForm,
  StudentPayments,
} from 'components/students';
import { format, isDate } from 'date-fns';
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
      className="flex w-full flex-col gap-3"
    >
      {!history?.length ? (
        <p className="text-center italic">No hay registros para este mes</p>
      ) : null}
      {history?.map((h) => {
        if ('payment' in h) {
          const Icon = iconByPaymentType[h.payment.type];
          return (
            <section
              className="relative flex w-full items-center justify-between gap-3 rounded-lg bg-teal-100/50 p-2 px-6 text-black"
              key={h.payment.id}
            >
              <div className="flex flex-col gap-2">
                <h1 className="font-bold">Pago</h1>
                <p>{format(h.date, 'dd-MM-yy')}</p>
              </div>
              <div className="text-3xl">{h.payment.hours} hs</div>
              <div className="self-end text-2xl">$ {h.payment.amount}</div>
              <div className="absolute top-0 right-4 p-2">
                <Icon size={20} />
              </div>
            </section>
          );
        } else {
          return (
            <section
              className="relative flex w-full items-center justify-between gap-3 rounded-lg bg-primary-100/50 p-2 px-6 text-black"
              key={h.classSession.id}
            >
              <div className="flex flex-col gap-2">
                <h1 className="font-bold">Clase</h1>
                <p>{format(h.date, 'dd-MM-yy')}</p>
              </div>
              <div className="self-center text-xl">
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

type StudentStatus = 'NO_HOURS' | 'HAS_HOURS';

const textColorClassByStatus: Record<StudentStatus, string> = {
  HAS_HOURS: 'text-green-500',
  NO_HOURS: 'text-gray-500',
};

const getPhraseByStatus = (hours: number, status: StudentStatus) => {
  const plural = hours === 1 ? '' : 's';
  switch (status) {
    case 'HAS_HOURS':
      return `( Tiene ${hours} hora${plural} disponible${plural} )`;
    case 'NO_HOURS':
      return '( No tiene horas disponibles )';
    default:
      return null;
  }
};

const getStatus = (hours: number) => {
  const value: StudentStatus = hours === 0 ? 'NO_HOURS' : 'HAS_HOURS';
  const color = textColorClassByStatus[value];
  const statusMessage = getPhraseByStatus(hours, value);
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

  const status = getStatus(data?.hourBalance ?? 0);

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
    [data]
  );

  if (!id)
    return (
      <section>
        <h1 className="text-3xl">Alumno no encontrado</h1>
      </section>
    );

  return (
    <section className="flex w-full flex-col items-center gap-3  p-3 sm:max-w-[550px]">
      <h1 className="text-3xl">
        {data?.name} {data?.lastName}
      </h1>
      <h2 className={`text-xl ${status.color}`}>{status.statusMessage}</h2>
      {data?.debts.amount ? (
        <h2 className={`text-xl text-red-500`}>
          {' '}
          Debe ( ${data.debts.amount} )
        </h2>
      ) : null}
      <section
        aria-label="action buttons"
        className="flex w-full flex-col gap-2"
      >
        <PillButton onClick={handleShowPaymentModal}>Cargar pago</PillButton>
        <PillButton onClick={handleShowClassSessionModal}>
          Cargar clase
        </PillButton>
      </section>
      <section
        aria-label="class and payment history"
        className="flex w-full flex-col gap-3"
      >
        <section className="flex w-full items-center justify-center gap-3 py-4">
          <div>
            <label>Mes</label>
          </div>
          <ReactDatePicker
            selected={month}
            onChange={handleMonthChange}
            dateFormat="MMMM-yy"
            showMonthYearPicker
            locale={es}
            className="w-full rounded-lg bg-primary-300/50 p-2 text-center"
            wrapperClassName="max-w-[150px] flex justify-center items-center"
          />
        </section>
        <StudentHistory month={parsedMonth} studentId={stableId} />
      </section>
      {showPaymentmodal ? (
        <Modal
          onBackdropClick={handleClosePaymentModal}
          className="w-full bg-white drop-shadow-2xl md:w-auto md:min-w-[400px]"
        >
          {data?.debts ? (
            <StudentPayments
              studentId={stableId}
              onFinished={handleClosePaymentModal}
            />
          ) : (
            <PaymentForm
              studentId={stableId}
              onFinished={handleClosePaymentModal}
            />
          )}
        </Modal>
      ) : null}
      {showClassSessionModal ? (
        <Modal
          onBackdropClick={handleCloseClassSessionModal}
          className="w-[90%] max-w-[500px] bg-white drop-shadow-2xl md:w-[60%]"
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
