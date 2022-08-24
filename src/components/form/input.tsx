import { ForwardedRef, forwardRef, InputHTMLAttributes } from 'react';

export const Input = forwardRef(
  (
    {
      className = '',
      invalid = false,
      ...props
    }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean },
    ref: ForwardedRef<HTMLInputElement>
  ) => {
    return (
      <input
        className={`bg-secondary-100 rounded-md px-3 py-1 focus:outline-none ${
          invalid
            ? 'focus:ring-red-500 ring-red-300 ring-2'
            : 'focus:ring-blackish-900'
        } placeholder:text-slate-500 focus:ring-2 text-black ${className}`}
        {...props}
        ref={ref}
      />
    );
  }
);

Input.displayName = 'Input';
