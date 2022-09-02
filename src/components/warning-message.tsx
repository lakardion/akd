import { FC, ReactNode } from 'react';
import { RiErrorWarningFill } from 'react-icons/ri';

export const WarningMessage: FC<{
  children: ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  return (
    <section
      className={`bg-accent-500 p-2 flex gap-3 items-center rounded-lg ${className}`}
    >
      <div>
        <RiErrorWarningFill
          className="fill-secondary-700"
          size={20}
          aria-label="Warning"
        />
      </div>
      {typeof children === 'string' ? (
        <p className="italic text-sm">{children}</p>
      ) : (
        children
      )}
    </section>
  );
};
