import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function Precios() {
  const router = useRouter();

  useEffect(() => {
    // we don't have a main page for this so we're redirecting to the corresponding slug
    if (router.asPath !== 'precios/alumnos') router.push('precios/alumnos');
  }, [router]);

  return <></>;
}
