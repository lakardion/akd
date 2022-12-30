import { signIn, signOut, useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FC, ReactNode } from 'react';
import { trpc } from 'utils/trpc';
import { Button, PillButton } from './button';
import { Spinner } from './spinner';

const routes = [
  { href: '/alumnos', label: 'alumnos' },
  { href: '/profesores', label: 'profesores' },
  { href: '/precios/alumnos', label: 'precios' },
  { href: '/clases', label: 'Clases' },
  { href: '/admin', label: 'Admin' },
];

export const Layout: FC<{ children: ReactNode }> = ({ children }) => {
  const { data: isAdmin } = trpc.auth.getPowers.useQuery();
  const router = useRouter();
  //TODO: not sure this is the right way to do things..
  // It may be just fine as it is right now.. we're restricting users within the google project anyway.
  const session = useSession();
  console.log('hello are you admin?', isAdmin);
  if (session.status === 'loading') {
    return (
      <section className="flex h-full w-full flex-col items-center justify-center gap-4">
        <h1>Checking your credentials...</h1>
        <Spinner size="md" />
      </section>
    );
  }
  if (session.status === 'unauthenticated') {
    return (
      <section className="flex h-full w-full flex-col items-center justify-center gap-4">
        <Image src={'/la-akd-sm.png'} height={300} width={210} />
        <div className="flex flex-col gap-2">
          <p className="text-slate-500">
            Debes ingresar con google para poder utilizar la aplicación
          </p>
          <PillButton onClick={() => signIn('google')}>Login</PillButton>
        </div>
      </section>
    );
  }
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
            <Button onClick={() => signOut()}>Logout</Button>
          </section>
        </section>
        <nav className="flex w-full gap-3 border border-solid border-b-blackish-900/50 p-2">
          {routes.map((r) => {
            const isCurrentRoute = router.pathname.includes(r.href);
            if (r.href === '/admin' && !isAdmin) return undefined;
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
