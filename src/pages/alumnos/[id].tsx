import { useRouter } from "next/router";
import { useMemo } from "react";
import { trpc } from "utils/trpc";

const StudentDetail = () => {
  const {
    query: { id },
  } = useRouter();

  const stableId = useMemo(() => {
    return typeof id === "string" ? id : "";
  }, [id]);

  const { data } = trpc.useQuery(["students.student", { id: stableId }], {
    enabled: Boolean(id),
  });

  if (!id)
    return (
      <section>
        <h1 className="text-3xl">Alumno no encontrado</h1>
      </section>
    );
  return (
    <section>
      <h1 className="text-3xl">
        {data?.name} {data?.lastName}
      </h1>
    </section>
  );
};
export default StudentDetail;
