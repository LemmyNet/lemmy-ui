import classNames from "classnames";

type SeparatorProps = {
  classes?: string;
  key?: string;
};
export function Separator({ classes, key }: SeparatorProps) {
  return <hr key={key} className={classNames("border", classes)} />;
}
