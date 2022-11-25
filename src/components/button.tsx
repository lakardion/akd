import { ButtonHTMLAttributes, FC } from 'react';
import { SizeVariant, Spinner } from './spinner';

export type ButtonColorVariant = 'primary' | 'accent' | 'secondary';
export const buttonClassByVariant: Record<ButtonColorVariant, string> = {
  primary:
    'bg-primary-800 hover:bg-primary-400 text-white disabled:hover:bg-primary-400',
  accent:
    'bg-accent hover:bg-primary-400 text-blackish-900 disabled:hover:bg-accent-300',
  secondary:
    'bg-secondary hover:bg-primary-200 text-blackish-900 disabled:hover:bg-secondary-300',
};
export const disabledBtnClasses =
  'disabled:hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed';
export const Button: FC<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    isLoading?: boolean;
    spinnerSize?: SizeVariant;
    variant?: ButtonColorVariant;
  }
> = ({
  children,
  type,
  isLoading = false,
  spinnerSize = 'sm',
  className,
  variant = 'primary',
  ...props
}) => {
  return (
    <button
      {...props}
      type={type ?? 'button'}
      className={`${buttonClassByVariant[variant]} ${disabledBtnClasses} rounded-md py-1 px-2  ${className}`}
    >
      {isLoading ? (
        <div className="flex w-full justify-center">
          <Spinner size={spinnerSize} />
        </div>
      ) : (
        children
      )}
    </button>
  );
};

export const PillButton: FC<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonColorVariant;
    isLoading?: boolean;
    spinnerSize?: SizeVariant;
  }
> = ({
  className,
  type,
  variant = 'primary',
  children,
  isLoading = false,
  spinnerSize = 'sm',
  ...props
}) => {
  return (
    <button
      {...props}
      type={type ?? 'button'}
      className={`${buttonClassByVariant[variant]} btn-disabled w-full rounded-lg p-3 ${className}`}
    >
      {isLoading ? (
        <div className="flex w-full justify-center">
          <Spinner size={spinnerSize} />
        </div>
      ) : (
        children
      )}
    </button>
  );
};
