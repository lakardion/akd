import { ForwardedRef, forwardRef, InputHTMLAttributes } from "react";

//TODO: add better styling
export const Input = forwardRef(
  (
    props: InputHTMLAttributes<HTMLInputElement>,
    ref: ForwardedRef<HTMLInputElement>
  ) => {
    return (
      <input
        className="bg-blackish-100/60 rounded-md px-3 py-1 focus:outline-none focus:ring focus:ring-primary-400 "
        {...props}
        ref={ref}
      />
    );
  }
);

Input.displayName = "Input";
