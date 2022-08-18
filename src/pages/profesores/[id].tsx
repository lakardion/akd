import { PaymentMethodType } from '@prisma/client';
import { PillButton } from 'components/button';
import { ClassSessionForm } from 'components/class-sessions/form';
import { Modal } from 'components/modal';
import { TeacherPaymentForm } from 'components/teachers';
import { format } from 'date-fns';
import { useRouter } from 'next/router';
import { FC, useMemo, useState } from 'react';
import ReactDatePicker from 'react-datepicker';
import { trpc } from 'utils/trpc';
import { BsCash } from 'react-icons/bs';
import { MdPayment } from 'react-icons/md';
import { IconType } from 'react-icons';
import { es } from 'date-fns/locale';

const iconByPaymentType: Record<PaymentMethodType, IconType> = {
  CASH: BsCash,
  TRANSFER: MdPayment,
};

const TeacherHistory: FC<{ month: string; teacherId: string }> = ({
  month,
  teacherId,
}) => {
  const { data: teacherHistory } = trpc.useQuery([
    'teachers.history',
    { month, teacherId },
  ]);
  return (
    <section
      aria-label="class and payment history"
      className="w-full flex flex-col gap-3"
    >
      {teacherHistory?.map((th) => {
        if ('payment' in th) {
          const Icon = iconByPaymentType[th.payment.type];
          return (
            <section
              className="relative w-full flex gap-3 p-2 px-6 bg-teal-100/50 text-black rounded-lg justify-between"
              key={th.payment.id}
            >
              <div className="flex flex-col gap-2">
                <h1 className="font-bold">Pago</h1>
                <p>{format(th.date, 'dd-MM-yy')}</p>
              </div>
              <div className="text-2xl self-end">$ {th.payment.amount}</div>
              <div className="absolute top-0 right-4 p-2">
                <Icon size={20} />
              </div>
            </section>
          );
        } else {
          return (
            <section
              className="relative w-full flex gap-3 p-2 px-6 bg-primary-100/50 text-black rounded-lg justify-between items-center"
              key={`${th.classSession.id}-${th.classSession.studentId}`}
            >
              <div className="flex flex-col gap-2">
                <h1 className="font-bold">Clase</h1>
                <p>{format(th.date, 'dd-MM-yy')}</p>
              </div>
              <div className="text-xl self-center">
                {th.classSession.studentFullName}
              </div>
              <p className="text-2xl">{th.classSession.hours} hs</p>
            </section>
          );
        }
      })}
    </section>
  );
};

const getBalanceStyle = (balance?: number) => {
  if (balance === undefined) return '';
  if (balance === 0) return 'text-gray-500';
  if (balance > 0) return 'text-red-500';
};

const TeacherDetail = () => {
  const [showPaymentmodal, setShowPaymentmodal] = useState(false);
  const [showClassSessionModal, setShowClassSessionModal] = useState(false);
  const [month, setMonth] = useState(new Date());

  const {
    query: { id },
  } = useRouter();

  const stableId = useMemo(() => {
    return typeof id === 'string' ? id : '';
  }, [id]);

  const { data } = trpc.useQuery(['teachers.single', { id: stableId }], {
    enabled: Boolean(id),
  });

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

  const parsedMonth = useMemo(() => {
    return format(month, 'yy-MM');
  }, [month]);

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
        <PillButton
          onClick={handleShowPaymentModal}
          disabled={data?.balance === 0}
        >
          Cargar pago
        </PillButton>
        <PillButton onClick={handleShowClassSessionModal}>
          Cargar clase
        </PillButton>
      </section>
      <section aria-label="teacher history cards" className="w-full">
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
            className="bg-primary-300/50 p-2 rounded-lg w-full"
            wrapperClassName="max-w-[150px] flex justify-center items-center"
          />
        </section>
        <TeacherHistory teacherId={stableId} month={parsedMonth} />
      </section>
      {showPaymentmodal ? (
        <Modal
          onBackdropClick={handleClosePaymentModal}
          className="w-full md:w-auto bg-white drop-shadow-2xl"
        >
          <TeacherPaymentForm
            teacherId={stableId}
            onFinished={handleClosePaymentModal}
            month={parsedMonth}
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
