import { StringBoolean } from "@utils/types";
import classNames from "classnames";
import { Icon } from "./icon";

// Need to disable this rule because ESLint flat out lies about labels not
// having an associated control in this component
/* eslint-disable jsx-a11y/label-has-associated-control */
interface PostHiddenSelect {
  showHidden?: StringBoolean;
  onShowHiddenChange: (hidden?: StringBoolean) => void;
}

export default function PostHiddenSelect({
  onShowHiddenChange,
  showHidden,
}: PostHiddenSelect) {
  function handleShowHiddenChange(event: any) {
    onShowHiddenChange(event.target.value);
  }

  return (
    <div
      className="show-hidden-select btn-group btn-group-toggle flex-wrap"
      role="group"
    >
      <label
        htmlFor="show-hidden"
        className={classNames("pointer btn btn-outline-secondary", {
          active: showHidden === "true",
        })}
      >
        <Icon icon="eye" inline />
      </label>
      <input
        id="show-hidden"
        type="radio"
        className="btn-check"
        value="true"
        checked={showHidden === "true"}
        onChange={handleShowHiddenChange}
      />

      <label
        htmlFor="hide-hidden"
        className={classNames("pointer btn btn-outline-secondary", {
          active: showHidden !== "true",
        })}
      >
        <Icon icon="eye-slash" inline />
      </label>
      <input
        id="hide-hidden"
        type="radio"
        className="btn-check"
        value="false"
        checked={showHidden !== "true"}
        onChange={handleShowHiddenChange}
      />
    </div>
  );
}
