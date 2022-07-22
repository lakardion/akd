import { FC } from "react";
import { FieldError } from "react-hook-form";

export const ValidationError: FC<{ error?: FieldError }> = ({ error }) => {
  if (!error) return null;
  return <p className="font-medium text-red-500">{error.message}</p>;
};
