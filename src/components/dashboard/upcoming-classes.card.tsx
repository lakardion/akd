import { Spinner } from 'components/spinner';
import { format } from 'date-fns';
import { MdHourglassTop, MdOutlineSchool } from 'react-icons/md';
import { trpc } from 'utils/trpc';

export const UpcomingClassesCard = () => {
  const { data: upcomingClasses, isLoading } =
    trpc.analytics.upcomingClasses.useQuery();

  if (isLoading || !upcomingClasses)
    return (
      <section className="flex items-center justify-center">
        <Spinner size="sm" />
      </section>
    );

  if (!upcomingClasses.length) {
    return (
      <section className="flex items-center justify-center p-2">
        <p className="italic">No hay ninguna clase agendada</p>
      </section>
    );
  }
  return (
    <ul className="max-h-96 overflow-auto">
      {upcomingClasses.map((uc) => (
        <li
          key={uc.id}
          className="flex gap-3 rounded-lg border-primary-300 p-3"
        >
          <section>{format(uc.date, 'dd/MM hh:mm')}</section>
          <section>
            {uc.teacher?.name} {uc.teacher?.lastName}
          </section>
          <section className="flex items-center">
            <div className="relative">
              <MdOutlineSchool size={25} />
              <div className="absolute -bottom-1.5 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent-500">
                <p className="text-xs text-accent-900">
                  {uc._count.classSessionStudent}
                </p>
              </div>
            </div>
            <div className="relative">
              <MdHourglassTop size={25} />
              <div className="absolute -bottom-1.5 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent-500">
                <p className="text-xs text-accent-900">{uc.hours}</p>
              </div>
            </div>
          </section>
        </li>
      ))}
    </ul>
  );
};
