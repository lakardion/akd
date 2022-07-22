import { ButtonHTMLAttributes, FC } from "react";

export const Button: FC<ButtonHTMLAttributes<HTMLButtonElement>> = ({
  children,
  type,
  ...props
}) => {
  //TODO: improve styling

  return (
    <button {...props} type={type ?? "button"}>
      {children}
    </button>
  );
};
