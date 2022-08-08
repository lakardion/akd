import { ChangeEvent, FC, MouseEvent, useState } from 'react';

export const SwitchFree: FC<{
  value?: boolean;
  size: number;
  toggle?: (e: MouseEvent<HTMLDivElement>) => void;
}> = ({ size, value: controlledValue, toggle }) => {
  const [uncontrolledValue, setUncontrolledValue] = useState(false);

  const value = controlledValue ? controlledValue : uncontrolledValue;
  const uncontrolledToggleChange = (e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setUncontrolledValue((prevValue) => {
      return !prevValue;
    });
  };
  const handleToggle =
    controlledValue && toggle ? toggle : uncontrolledToggleChange;

  const translateClass = value ? `translate-x-full` : '';
  const bgSwitch = value ? `bg-green-500` : 'bg-gray-400';
  const ratio = 1.2;
  return (
    <section style={{ width: `${size * 2}px` }} className={`aspect-video`}>
      <input
        hidden
        type="checkbox"
        checked={value}
        value={value.toString()}
        readOnly
      />
      <div
        className={`w-full h-full rounded-l-full rounded-r-full relative hover:cursor-pointer ${bgSwitch}`}
        onClick={handleToggle}
      >
        <div
          style={{
            left: `${size / (ratio * 5)}px`,
            width: `${size / ratio}px`,
            height: `${size / ratio}px`,
          }}
          className={`absolute bg-gray-100 rounded-full transition-transform ease-linear duration-200  transform hover:scale-105 hover:bg-teal-100 -translate-y-1/2 top-1/2 ${translateClass}`}
        ></div>
      </div>
    </section>
  );
};
