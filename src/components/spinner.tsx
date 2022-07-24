import { CSSProperties, FC } from "react";

export type SizeVariant = "xs" | "sm" | "md" | "lg" | "xl";
const BASE_SIZE = 20;
const mapWidthHeightBySize: Record<
  SizeVariant,
  { width: number; height: number }
> = {
  xs: {
    height: BASE_SIZE,
    width: BASE_SIZE,
  },
  sm: {
    height: BASE_SIZE * 2,
    width: BASE_SIZE * 2,
  },
  md: {
    height: BASE_SIZE * 3,
    width: BASE_SIZE * 3,
  },
  lg: {
    height: BASE_SIZE * 4,
    width: BASE_SIZE * 4,
  },
  xl: {
    height: BASE_SIZE * 5,
    width: BASE_SIZE * 5,
  },
};

/**
 * @author https://www.notimedad.dev/easy-react-spinner-component/
 */
export const Spinner: FC<{
  customStyles?: CSSProperties;
  size: SizeVariant;
}> = ({ customStyles = {}, size }) => {
  const defaultStyles = {
    border: "10px solid #f3f3f3",
    borderTop: "10px solid #3498db",
    width: "100px",
    height: "100px",
    borderRadius: "50%",
    animation: "spin 1s ease-in-out infinite",
  };

  return (
    <div
      style={{
        ...defaultStyles,
        ...customStyles,
        ...mapWidthHeightBySize[size],
      }}
    ></div>
  );
};
