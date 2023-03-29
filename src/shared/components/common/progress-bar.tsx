import classNames from "classnames";
import { ThemeColor } from "shared/utils";

type ProgressBarProps = {
  className?: string;
  backgroundColor?: ThemeColor;
  barColor?: ThemeColor;
  striped?: boolean;
  animated?: boolean;
  min?: number;
  max?: number;
  value: number;
  text?: string;
};

const ProgressBar = ({
  value,
  animated = false,
  backgroundColor = "secondary",
  barColor = "primary",
  className,
  max = 100,
  min = 0,
  striped = false,
  text,
}: ProgressBarProps) => (
  <div className={classNames("progress", `bg-${backgroundColor}`, className)}>
    <div
      className={classNames("progress-bar", `bg-${barColor}`, {
        "progress-bar-striped": striped,
        "progress-bar-animated": animated,
      })}
      role="progressbar"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      style={`width: ${(value / max) * 100}%;`}
    >
      {text}
    </div>
  </div>
);

export default ProgressBar;
