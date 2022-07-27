import { ButtonHTMLAttributes, FC } from "react";
import { SizeVariant, Spinner } from "./spinner";

export type ButtonColorVariant = "primary" | "accent" | "secondary";
export const buttonClassByVariant: Record<ButtonColorVariant, string> = {
  primary: "bg-primary-800 hover:bg-primary-400 text-white ",
  accent: "bg-accent hover:bg-primary-400 text-blackish-900 ",
  secondary: "bg-secondary hover:bg-primary-200 text-blackish-900 ",
};

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
  spinnerSize = "sm",
  className,
  variant = "primary",
  ...props
}) => {
  return (
    <button
      {...props}
      type={type ?? "button"}
      className={`${buttonClassByVariant[variant]} py-1 px-2 rounded-md  ${className}`}
    >
      {isLoading ? <Spinner size={spinnerSize} /> : children}
    </button>
  );
};

export const PillButton: FC<
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonColorVariant }
> = ({ className, type, variant = "primary", children, ...props }) => {
  return (
    <button
      {...props}
      type={type ?? "button"}
      className={`${buttonClassByVariant[variant]} rounded-lg w-full p-3 ${className}`}
    >
      {children}
    </button>
  );
};
