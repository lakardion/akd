import { DebtorsCard } from 'components/dashboard/debtors-card';
import { RevenueCard } from 'components/dashboard/revenue-card';
import { UpcomingClassesCard } from 'components/dashboard/upcoming-classes.card';
import type { NextPage } from 'next';
import Head from 'next/head';
import { FC, ReactNode } from 'react';
import { trpc } from 'utils/trpc';

const DashboardCard: FC<{ title: string; children: ReactNode }> = ({
  children,
  title,
}) => {
  return (
    <section className="max-w-xs rounded-md border border-gray-300 p-3 shadow-sm">
      <h1 className="text text-slate-500">{title}</h1>
      {children}
    </section>
  );
};

const Home: NextPage = () => {
  return (
    <>
      <Head>
        <title>La Academia R&S</title>
        <meta
          name="description"
          content="Sitio para trazar tus actividades como profesor"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <section className="container mx-auto flex items-start gap-4 p-4 md:h-[calc(100vh-94px)]">
        <DashboardCard title="Deudores">
          <DebtorsCard />
        </DashboardCard>
        <DashboardCard title="Próximas clases">
          <UpcomingClassesCard />
        </DashboardCard>
        <DashboardCard title="Recaudación en el mes">
          <RevenueCard />
        </DashboardCard>
      </section>
    </>
  );
};

export default Home;
