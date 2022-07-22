import { CSSProperties, FC } from "react";

/**
 * @author https://www.notimedad.dev/easy-react-spinner-component/
 */
export const Spinner: FC<{ customStyles?: CSSProperties }> = ({
  customStyles = {},
}) => {
  const defaultStyles = {
    border: "10px solid #f3f3f3",
    borderTop: "10px solid #3498db",
    width: "100px",
    height: "100px",
    borderRadius: "50%",
    animation: "spin 1s ease-in-out infinite",
  };

  return <div style={{ ...defaultStyles, ...customStyles }}></div>;
};
