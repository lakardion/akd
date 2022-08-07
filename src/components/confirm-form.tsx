import { FC, ReactNode } from 'react';
import { Button } from './button';

export const ConfirmForm: FC<{
  body: ReactNode;
  title?: string;
  onConfirm: () => void;
  onCancel: () => void;
  errorMessage?: string;
  isConfirming?: boolean;
}> = ({
  title = 'Estás seguro?',
  onConfirm,
  onCancel,
  body,
  errorMessage,
  isConfirming = false,
}) => {
  return (
    <section className="p-3 flex flex-col gap-3">
      <h1 className="text-3xl text-center">{title}</h1>
      {typeof body === 'string' ? (
        <p className="text-sm text-center">{body}</p>
      ) : (
        body
      )}
      <section aria-label="action buttons" className="flex gap-3">
        <Button
          onClick={onConfirm}
          isLoading={isConfirming}
          className="flex-grow"
        >
          Confirmar
        </Button>
        <Button onClick={onCancel} className="flex-grow">
          Cancelar
        </Button>
      </section>
      {errorMessage ? (
        <p className="text-red-500 font-medium">{errorMessage}</p>
      ) : null}
    </section>
  );
};
