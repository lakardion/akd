import { FC } from "react";
import { FieldError } from "react-hook-form";

const listFormat = new Intl.ListFormat("es");

export const ValidationError: FC<{ errorMessages?: string | string[] }> = ({
  errorMessages,
}) => {
  const isArray = Array.isArray(errorMessages);
  if (!errorMessages || (isArray && errorMessages.length === 0)) return null;
  if (isArray)
    return (
      <p className="font-medium text-red-500">
        {listFormat.format(errorMessages)}
      </p>
    );
  return <p className="font-medium text-red-500">{errorMessages}</p>;
};
