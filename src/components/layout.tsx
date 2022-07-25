import Link from "next/link";
import { useRouter } from "next/router";
import { FC, ReactNode } from "react";
import { Button } from "./button";

const routes = [
  { href: "/alumnos", label: "alumnos" },
  { href: "/profesores", label: "profesores" },
  { href: "/precios", label: "precios" },
];

export const Layout: FC<{ children: ReactNode }> = ({ children }) => {
  const handleLogin = () => {};
  const router = useRouter();
  return (
    <div className="w-screen h-screen">
      <header className="w-full pb-1 text-accent-900">
        <section className="flex justify-between w-full p-2">
          <section>La Academia Reg&amp;Stats</section>
          <section>
            <Button onClick={handleLogin}>Login</Button>
          </section>
        </section>
        <nav className="flex gap-3 w-full p-2 border border-solid border-b-blackish-900/50">
          {routes.map((r) => {
            const isCurrentRoute = router.pathname.includes(r.href);
            return (
              <Link href={r.href} key={r.href}>
                <button
                  type="button"
                  className={`hover:text-primary-900/75 capitalize ${
                    isCurrentRoute ? "text-primary-500" : ""
                  }`}
                >
                  {r.label}
                </button>
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="flex justify-center items-center">{children}</main>
    </div>
  );
};
