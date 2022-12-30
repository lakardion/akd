import { DebtorsCard } from 'components/dashboard/debtors-card';
import { NewStudentsCard } from 'components/dashboard/new-students-card';
import { RecurrentStudentsCard } from 'components/dashboard/recurrent-students-card';
import { RevenueCard } from 'components/dashboard/revenue-card';
import { UpcomingClassesCard } from 'components/dashboard/upcoming-classes.card';
import type { NextPage } from 'next';
import Head from 'next/head';
import { FC, ReactNode } from 'react';

const DashboardCard: FC<{ title: string; children: ReactNode }> = ({
  children,
  title,
}) => {
  return (
    <section className="flex w-full flex-col items-center gap-2 rounded-md border border-gray-300 p-3 shadow-sm">
      <h1 className="text text-slate-500">{title}</h1>
      {children}
    </section>
  );
};

const Home: NextPage = () => {
  return (
    <section className="w-full overflow-auto p-3">
      <Head>
        <title>La Academia R&S</title>
        <meta
          name="description"
          content="Sitio para trazar tus actividades como profesor"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <section className="flex flex-col items-center justify-center gap-4 overflow-auto md:flex-row md:items-start">
        <section className="w-full flex-grow">
          <DashboardCard title="Deudores">
            <DebtorsCard />
          </DashboardCard>
        </section>
        <section className="flex w-full flex-grow flex-col gap-4">
          <DashboardCard title="Próximas clases">
            <UpcomingClassesCard />
          </DashboardCard>
          <DashboardCard title="Nuevos alumnos este mes">
            <NewStudentsCard />
          </DashboardCard>
        </section>
        <section className="flex w-full flex-grow flex-col justify-center gap-4">
          <DashboardCard title="Recaudación en el mes">
            <RevenueCard />
          </DashboardCard>
          <DashboardCard title="Alumnos recurrentes este mes">
            <RecurrentStudentsCard />
          </DashboardCard>
        </section>
      </section>
    </section>
  );
};

export default Home;
