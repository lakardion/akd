import type { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';

const routes = [
  { href: '/alumnos', label: 'Alumnos' },
  { href: '/profesores', label: 'Profesores' },
  { href: '/precios', label: 'Precios' },
  { href: '#', label: 'Gastos [Coming soon!]' },
  { href: '#', label: 'Reportes [Coming soon!]' },
];

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

      <section className="container mx-auto flex flex-col items-center justify-center p-4 md:h-[calc(100vh-94px)]">
        <ul>
          {routes.map((r) => (
            <li key={r.href}>
              <Link href={r.href}>
                <button className="hover:text-teal-600">{r.label}</button>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
};

export default Home;
