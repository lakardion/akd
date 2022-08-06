import Link from 'next/link';
import { useRouter } from 'next/router';

const Prices = () => {
  const router = useRouter();
  return (
    <>
      <ul>
        <li>
          <Link href={`${router.asPath}/alumnos`}>
            <button type="button" className="hover:text-teal-600">
              Alumnos
            </button>
          </Link>
        </li>
        <li>
          <Link href={`${router.asPath}/profesores`}>
            <button className="hover:text-teal-600" type="button">
              Profesores
            </button>
          </Link>
        </li>
      </ul>
    </>
  );
};
export default Prices;
