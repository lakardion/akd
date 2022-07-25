import { ButtonHTMLAttributes, FC } from "react";
import { SizeVariant, Spinner } from "./spinner";

export const Button: FC<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    isLoading?: boolean;
    spinnerSize?: SizeVariant;
  }
> = ({ children, type, isLoading = false, spinnerSize = "sm", ...props }) => {
  //TODO: improve styling

  return (
    <button
      {...props}
      type={type ?? "button"}
      className="bg-primary-800 text-white py-1 px-2 rounded-md"
    >
      {isLoading ? <Spinner size={spinnerSize} /> : children}
    </button>
  );
};
