import Link from 'next/link';
import { useRouter } from 'next/router';
import { FC, ReactNode } from 'react';
import { Button } from './button';

const routes = [
  { href: '/alumnos', label: 'alumnos' },
  { href: '/profesores', label: 'profesores' },
  { href: '/precios/alumnos', label: 'precios' },
  { href: '/clases', label: 'Clases' },
];

export const Layout: FC<{ children: ReactNode }> = ({ children }) => {
  const handleLogin = () => {
    //TODO:
  };
  const router = useRouter();
  return (
    <div className="flex h-screen flex-col">
      <header className="w-full pb-1 text-accent-900">
        <section className="flex w-full justify-between p-2">
          <Link href="/">
            <section className="hover:cursor-pointer">
              <span className="text-2xl">La Academia </span>
              <span className="bg-gradient-to-r from-primary to-blackish bg-clip-text text-transparent">
                Reg&amp;Stats
              </span>
            </section>
          </Link>
          <section>
            <Button onClick={handleLogin}>Login</Button>
          </section>
        </section>
        <nav className="flex w-full gap-3 border border-solid border-b-blackish-900/50 p-2">
          {routes.map((r) => {
            const isCurrentRoute = router.pathname.includes(r.href);
            return (
              <Link href={r.href} key={r.href}>
                <button
                  type="button"
                  className={`capitalize hover:text-primary-500/75 ${
                    isCurrentRoute ? 'text-primary-500' : ''
                  }`}
                >
                  {r.label}
                </button>
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="flex flex-grow justify-center overflow-hidden">
        {children}
      </main>
    </div>
  );
};
