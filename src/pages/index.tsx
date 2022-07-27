import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";

type TechnologyCardProps = {
  name: string;
  description: string;
  documentation: string;
};

const routes = [
  { href: "/alumnos", label: "Alumnos" },
  { href: "/profesores", label: "Profesores" },
  { href: "/precios", label: "Precios" },
  { href: "#", label: "Gastos [Coming soon!]" },
  { href: "#", label: "Reportes [Coming soon!]" },
];

const Home: NextPage = () => {
  return (
    <>
      <Head>
        <title>Create T3 App</title>
        <meta name="description" content="Generated by create-t3-app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto flex flex-col items-center justify-center h-screen p-4">
        <ul>
          {routes.map((r) => (
            <li key={r.href}>
              <Link href={r.href}>
                <button className="hover:text-teal-600">{r.label}</button>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
};

export default Home;
