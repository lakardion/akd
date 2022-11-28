import { FC, ReactNode } from 'react';
import { Button, PillButton } from './button';

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
    <section className="flex flex-col gap-3 p-3">
      <h1 className="text-center text-3xl">{title}</h1>
      {typeof body === 'string' ? (
        <p className="text-center text-sm">{body}</p>
      ) : (
        body
      )}
      <section aria-label="action buttons" className="flex gap-3">
        <PillButton
          onClick={onConfirm}
          isLoading={isConfirming}
          className="flex-grow"
        >
          Confirmar
        </PillButton>
        <PillButton onClick={onCancel} className="flex-grow">
          Cancelar
        </PillButton>
      </section>
      {errorMessage ? (
        <p className="font-medium text-red-500">{errorMessage}</p>
      ) : null}
    </section>
  );
};
