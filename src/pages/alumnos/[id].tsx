import { zodResolver } from "@hookform/resolvers/zod";
import { PaymentMethodType } from "@prisma/client";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { PillButton } from "components/button";
import { Input } from "components/form/input";
import { ValidationError } from "components/form/validation-error";
import { Modal } from "components/modal";
import { format, isMatch, parse } from "date-fns";
import { Decimal } from "decimal.js";
import { useRouter } from "next/router";
import { ChangeEvent, FC, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import ReactSelect, { SingleValue } from "react-select";
import AsyncReactSelect from "react-select/async";
import { debouncedSearchTeachers } from "utils/client-search-utils";
import { debouncePromiseValue } from "utils/delay";
import { createTRPCVanillaClient, trpc } from "utils/trpc";
import { z } from "zod";

const paymentFormZod = z.object({
  hours: z
    .string()
    .min(1, "Requerido")
    .refine((value) => value !== "0", "Must be greater than 0"),
  value: z
    .string()
    .min(1, "Requerido")
    .refine((value) => value !== "0", "Must be a number"),
  date: z.string().refine((value) => {
    if (!isMatch(value, "yyyy-MM-dd")) return false;
    return true;
  }),
  paymentMethod: z.enum([PaymentMethodType.CASH, PaymentMethodType.TRANSFER]),
});
type PaymentFormInput = z.infer<typeof paymentFormZod>;

type HourType = "package" | "rate";
type HourTypeSelectOption = SingleValue<
  { value: HourType; label: string } | undefined
>;
type HourPackageSelectOption = SingleValue<{
  value: string;
  label: string;
  extra: { hours: number; amount: number };
}>;

type HourRateSelectOption = SingleValue<{
  value: string;
  label: string;
  extra: { rate: number };
}>;

const classSessionFormZod = z.object({
  date: z.string().refine((value) => {
    if (!isMatch(value, "yyyy-MM-dd")) return false;
    return true;
  }, "Invalid date, should be yyyy-mm-dd"),
  teacherId: z.string().min(1, "Requerido"),
});

type ClassSessionFormInput = z.infer<typeof classSessionFormZod>;

//? might need to debounce this..

const ClassSessionForm: FC<{ onFinished: () => void }> = ({ onFinished }) => {
  const {
    handleSubmit,
    register,
    formState: { errors },
    control,
  } = useForm<ClassSessionFormInput>({
    resolver: zodResolver(classSessionFormZod),
  });
  const onSubmit = async () => {};

  const [selectedTeacher, setSelectedTeacher] =
    useState<SingleValue<{ value: string; label: string }>>();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <h1 className="text-2xl">Cargar clase</h1>
      <label htmlFor="date">Fecha</label>
      <Input type="date" {...register("date")} />
      <ValidationError errorMessages={errors.date?.message} />

      <label>Profesor</label>
      <Controller
        name="teacherId"
        control={control}
        render={({ field }) => (
          <AsyncReactSelect
            loadOptions={debouncedSearchTeachers}
            defaultOptions
            onBlur={field.onBlur}
            ref={field.ref}
            className="text-black akd-container"
            classNamePrefix="akd"
            onChange={(value) => {
              field.onChange(value?.value ?? "");
              setSelectedTeacher(value);
            }}
            value={selectedTeacher}
            placeholder="Seleccionar profesor"
          />
        )}
      />
      <ValidationError errorMessages={errors.teacherId?.message} />
    </form>
  );
};

const PaymentForm: FC<{ studentId: string; onFinished: () => void }> = ({
  studentId,
  onFinished,
}) => {
  const { data: hourRates } = trpc.useQuery([
    "rates.hourRates",
    { type: "STUDENT" },
  ]);
  const queryClient = trpc.useContext();
  const { data: hourPackages } = trpc.useQuery(["rates.hourPackages"]);
  const { mutateAsync: create, isLoading: isCreating } = trpc.useMutation(
    "payments.create",
    {
      onSuccess: () => {
        queryClient.invalidateQueries([
          "payments.byStudent",
          { id: studentId },
        ]);
      },
    }
  );
  const [hourTypeSelected, setHourTypeSelected] =
    useState<HourTypeSelectOption>();
  const [selectedHourRate, setSelectedHourRate] = useState<number>();
  const handleHourTypeChange = (option: HourTypeSelectOption) => {
    setHourTypeSelected(option);
    setSelectedHourRate(undefined);
    setValue("value", "");
  };
  const {
    formState: { errors },
    handleSubmit,
    register,
    setValue,
    getValues,
  } = useForm<PaymentFormInput>({ resolver: zodResolver(paymentFormZod) });

  const packageOptions: HourPackageSelectOption[] = useMemo(
    () =>
      hourPackages?.map((hp) => ({
        value: hp.id,
        label: `${hp.description} (x${hp.packHours})`,
        extra: { hours: hp.packHours, amount: hp.totalValue },
      })) ?? [],
    [hourPackages]
  );
  const handlePackageChange = (option: HourPackageSelectOption) => {
    setValue("hours", option?.extra.hours.toString() ?? "");
    setValue("value", option?.extra.amount.toString() ?? "");
  };
  const hourRateOptions: HourRateSelectOption[] = useMemo(
    () =>
      hourRates?.map((hr) => ({
        value: hr.id,
        label: hr.description,
        extra: { rate: hr.rate },
      })) ?? [],
    [hourRates]
  );
  const handleRateOptionChange = (
    options: HourRateSelectOption | undefined
  ) => {
    setSelectedHourRate(options?.extra.rate);
    const hours = getValues().hours;
    const decimalHours = new Decimal(hours);
    const decimalRate = new Decimal(options?.extra.rate ?? 1);
    setValue("value", decimalHours.times(decimalRate).toString());
  };

  const { onChange: onChangeHours, ...restRegisterHours } = useMemo(
    () => register("hours"),
    [register]
  );
  const handleHourChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (hourTypeSelected?.value === "rate") {
      const decimalValue = new Decimal(e.target.value);
      const hourRateDecimal = new Decimal(selectedHourRate ?? 1);
      setValue("value", decimalValue.times(hourRateDecimal).toString());
    }
    onChangeHours(e);
  };

  const onSubmit = async (data: PaymentFormInput) => {
    await create({
      studentId,
      date: parse(data.date, "yyyy-MM-dd", new Date()),
      hours: parseFloat(data.hours),
      value: parseFloat(data.value),
      paymentMethod: data.paymentMethod,
    });
    onFinished();
  };

  //choose the hour rate to apply and the amount of hours OR the package
  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col p-3 gap-2 w-full md:max-w-[500px]"
    >
      <h1 className="text-3xl text-center">Agregar pago</h1>
      <label htmlFor="date">Date</label>
      <Input {...register("date")} type="date" />
      <ValidationError errorMessages={errors.date?.message} />
      <label>Tipo de hora</label>
      <ReactSelect
        placeholder="Seleccionar tipo de hora"
        options={[
          { value: "rate", label: "Ratio por hora" },
          { value: "package", label: "Paquete de horas" },
        ]}
        value={hourTypeSelected}
        onChange={handleHourTypeChange}
        className="text-blackish-900 akd-container"
        classNamePrefix={"akd"}
      />
      {hourTypeSelected?.value === "package" ? (
        <>
          <label>Paquete de horas</label>
          <ReactSelect
            options={packageOptions}
            placeholder="Seleccioná un paquete..."
            onChange={handlePackageChange}
            className="text-blackish-900 akd-container"
            key="hour-package"
            classNamePrefix="akd"
          />
          <label htmlFor="value">Cantidad de horas</label>
          <Input
            type="number"
            readOnly
            onChange={handleHourChange}
            placeholder="Cantidad de horas..."
            {...restRegisterHours}
          />
          <ValidationError errorMessages={errors.hours?.message} />
        </>
      ) : (
        <>
          <label>Ratio de hora</label>
          <ReactSelect
            options={hourRateOptions}
            placeholder="Seleccioná un ratio..."
            onChange={handleRateOptionChange}
            className="text-blackish-900 akd-container"
            key="hour-rate"
            classNamePrefix={"akd"}
          />
          <label htmlFor="hours">Cantidad de horas</label>
          <Input
            type="number"
            onChange={handleHourChange}
            {...restRegisterHours}
            placeholder="Cantidad de horas..."
          />
          <ValidationError errorMessages={errors.hours?.message} />
          <label htmlFor="value" className="text-2xl">
            Total $
          </label>
        </>
      )}
      <label htmlFor="paymentMethod">Payment method</label>
      <div className="flex items-center">
        <div className="flex-grow flex justify-center gap-3 items-center">
          <label htmlFor="cash">Efectivo</label>
          <Input
            type="radio"
            id="cash"
            value={PaymentMethodType.CASH}
            {...register("paymentMethod")}
            className="border-0 w-full h-6"
          />
        </div>
        <div className="flex-grow flex justify-center gap-3 items-center">
          <label htmlFor="transfer">Transferencia</label>
          <Input
            type="radio"
            id="transfer"
            value={PaymentMethodType.TRANSFER}
            {...register("paymentMethod")}
            className="border-0 h-6 w-full"
          />
        </div>
      </div>
      <label htmlFor="value" className="text-2xl">
        Total $
      </label>
      <Input
        readOnly
        type="number"
        {...register("value")}
        className=" text-center text-blackish text-6xl rounded-lg"
      />
      <section aria-label="action buttons" className="flex gap-2">
        <PillButton type="submit" className="flex-grow" variant="accent">
          Agregar
        </PillButton>
        <PillButton className="flex-grow" onClick={onFinished} variant="accent">
          Cancelar
        </PillButton>
      </section>
    </form>
  );
};

const defaultColumns: ColumnDef<{
  value: number;
  hourValue: number;
  date: Date;
  publicId: number;
}>[] = [
  {
    id: "publicId",
    accessorKey: "publicId",
    header: "#",
  },
  {
    id: "date",
    header: "Día",
    accessorFn: (vals) => format(vals.date, "dd-MM-yyyy"),
  },
  {
    id: "hourValue",
    accessorKey: "hourValue",
    header: "Horas",
  },
  {
    id: "value",
    accessorFn: (vals) => `$ ${vals.value}`,
    header: "Monto total",
  },
];
const ClassSessionTable = () => {
  return <></>;
};
const PaymentTable: FC<{ studentId: string }> = ({ studentId }) => {
  const { data } = trpc.useQuery(["payments.byStudent", { id: studentId }], {
    enabled: Boolean(studentId),
  });

  const table = useReactTable({
    data: data ?? [],
    columns: defaultColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (!data?.length)
    return (
      <section className="flex justify-center w-full items-center italic font-medium">
        <p>No hay pagos para mostrar</p>
      </section>
    );

  return (
    <table className="w-full text-right">
      <thead>
        {table.getHeaderGroups().map((hg, idx, arr) => (
          <tr key={hg.id}>
            {hg.headers.map((h, idx, arr) => {
              const leftCornerClassName = idx === 0 ? "rounded-tl-lg" : "";
              const rightCornerClassName =
                idx === arr.length - 1 ? "rounded-tr-lg" : "";
              return (
                <th
                  key={h.id}
                  className={`bg-red-400 ${leftCornerClassName}${rightCornerClassName} pr-1`}
                >
                  {flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              );
            })}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((r, ridx, rarr) => (
          <tr key={r.id}>
            {r.getVisibleCells().map((c, cidx, carr) => {
              const leftBottomCornerClassName =
                ridx === rarr.length - 1 && cidx === 0 ? "rounded-bl-lg" : "";
              const rightBottomCornerClassName =
                ridx === rarr.length - 1 && cidx === carr.length - 1
                  ? "rounded-br-lg"
                  : "";
              return (
                <td
                  key={c.id}
                  className={`${leftBottomCornerClassName}${rightBottomCornerClassName} ${
                    ridx % 2 === 1 ? "bg-primary-100" : "bg-primary-50"
                  } pr-1`}
                >
                  {flexRender(c.column.columnDef.cell, c.getContext())}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const PaymentsList: FC<{ studentId: string }> = ({ studentId }) => {
  const { data } = trpc.useQuery(["payments.byStudent", { id: studentId }], {
    enabled: Boolean(studentId),
  });

  return (
    <ul>
      {data?.map((p) => (
        <li key={p.id}>
          <p>$ {p.value}</p>
        </li>
      ))}
    </ul>
  );
};

const activeViewClass = "bg-primary-700 text-white";
type StudentStatus = "OWES" | "NO_HOURS" | "HAS_HOURS";

const colorByStatus: Record<StudentStatus, string> = {
  HAS_HOURS: "green-500",
  NO_HOURS: "gray-500",
  OWES: "red-500",
};

const getPhraseByStatus = (hours: number, status: StudentStatus) => {
  const plural = hours === 1 ? "" : "s";
  switch (status) {
    case "HAS_HOURS":
      return `( Tiene ${hours} hora${plural} disponible${plural} )`;
    case "NO_HOURS":
      return "( No tiene horas disponibles )";
    case "OWES":
      return `( Debe ${hours} hora${plural} )`;
  }
};

const getStatus = (hours: number) => {
  const value: StudentStatus =
    hours < 0 ? "OWES" : hours === 0 ? "NO_HOURS" : "HAS_HOURS";
  const color = colorByStatus[value];
  const statusMessage = getPhraseByStatus(hours, value);
  return { value, color, statusMessage };
};

const StudentDetail = () => {
  const [showPaymentmodal, setShowPaymentmodal] = useState(false);
  const [showClassSessionModal, setShowClassSessionModal] = useState(false);
  const [activeView, setActiveView] = useState<"payments" | "classes">(
    "payments"
  );
  const {
    query: { id },
  } = useRouter();

  const stableId = useMemo(() => {
    return typeof id === "string" ? id : "";
  }, [id]);

  const { data } = trpc.useQuery(["students.single", { id: stableId }], {
    enabled: Boolean(id),
  });
  const status = getStatus(data?.hourBalance ?? 0);

  const handleSetPaymentActiveView = () => {
    setActiveView("payments");
  };
  const handleSetClassesActiveView = () => {
    setActiveView("classes");
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
    <section className="flex flex-col gap-3 items-center p-3 md:min-w-[500px]">
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
              activeView === "payments"
                ? activeViewClass
                : "hover:bg-primary-400 hover:text-white"
            }`}
            onClick={handleSetPaymentActiveView}
          >
            Pagos
          </div>
          <div
            className={`flex-grow text-center rounded-r-full transition-colors ease-in-out delay-150 ${
              activeView === "classes"
                ? activeViewClass
                : "hover:bg-primary-400 hover:text-white"
            }`}
            onClick={handleSetClassesActiveView}
          >
            Clases
          </div>
        </header>
        {activeView === "payments" ? (
          <PaymentTable studentId={stableId} />
        ) : (
          <ClassSessionTable />
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
