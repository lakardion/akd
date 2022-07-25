import { FC, LabelHTMLAttributes } from "react";

export const Label: FC<LabelHTMLAttributes<HTMLLabelElement>> = (props) => {
  return (
    <label
      className="border border-solid border-b-blackish-600/30"
      {...props}
    />
  );
};
