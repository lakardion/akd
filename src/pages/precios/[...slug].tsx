import { StudentHourRates, TeacherHourRates } from 'components/prices';
import { useRouter } from 'next/router';

const activeViewClass = 'bg-primary-700 text-white';

type ActiveView = 'alumnos' | 'profesores';

const Prices = () => {
  const router = useRouter();
  const [activeView] =
    (router.query?.slug as [activeView: ActiveView | undefined]) ?? [];

  const currentView = activeView ? (
    activeView === 'alumnos' ? (
      <StudentHourRates />
    ) : (
      <TeacherHourRates />
    )
  ) : undefined;

  return (
    <section className="flex flex-grow flex-col gap-3 rounded-lg p-4 sm:max-w-2xl">
      <h1 className="text-center text-2xl">Precios</h1>
      <header className="flex w-full items-center justify-center rounded-r-full rounded-l-full border border-solid border-blackish-600 bg-blackish-300 text-blackish-800/80 hover:cursor-pointer">
        <div
          className={`flex-grow rounded-l-full  text-center transition-colors delay-150 ease-in-out ${
            activeView === 'alumnos'
              ? activeViewClass
              : 'hover:bg-primary-400 hover:text-white'
          }`}
          onClick={() => router.replace('alumnos')}
        >
          Alumnos
        </div>
        <div
          className={`flex-grow rounded-r-full text-center transition-colors delay-150 ease-in-out ${
            activeView === 'profesores'
              ? activeViewClass
              : 'hover:bg-primary-400 hover:text-white'
          }`}
          onClick={() => router.replace('profesores')}
        >
          Profesores
        </div>
      </header>
      {currentView}
    </section>
  );
};
export default Prices;
