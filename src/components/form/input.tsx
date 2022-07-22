import {
  FC,
  ForwardedRef,
  forwardRef,
  HTMLInputTypeAttribute,
  InputHTMLAttributes,
} from "react";

//TODO: add better styling
export const Input = forwardRef(
  (
    props: InputHTMLAttributes<HTMLInputElement>,
    ref: ForwardedRef<HTMLInputElement>
  ) => {
    return <input {...props} ref={ref} />;
  }
);

Input.displayName = "Input";
