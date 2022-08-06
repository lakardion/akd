import { ForwardedRef, forwardRef, InputHTMLAttributes } from 'react';

//TODO: add better styling
export const Input = forwardRef(
  (
    props: InputHTMLAttributes<HTMLInputElement>,
    ref: ForwardedRef<HTMLInputElement>
  ) => {
    return (
      <input
        className="bg-secondary-100 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blackish-900 placeholder:text-slate-500 text-black"
        {...props}
        ref={ref}
      />
    );
  }
);

Input.displayName = 'Input';
