import { getStaticDir } from "@utils/env";
import classNames from "classnames";
import { I18NextService } from "../../services";

type IconProps = {
  icon: string;
  classes?: string;
  inline?: boolean;
  small?: boolean;
};

export function Icon({ icon, classes, inline, small }: IconProps) {
  return (
    <svg
      className={classNames("icon", classes, {
        "icon-inline": inline,
        small: small,
      })}
      aria-hidden="true"
    >
      <use
        xlinkHref={`${getStaticDir()}/assets/symbols.svg#icon-${icon}`}
      ></use>
    </svg>
  );
}

type SpinnerProps = {
  large?: boolean;
  centered?: boolean;
  className?: string;
};

export function Spinner({ large, centered, className }: SpinnerProps) {
  if (centered) {
    return (
      <div className="d-flex align-items-center justify-content-center py-4 my-2">
        <Spinner large={large} className={className} />
      </div>
    );
  }

  return (
    <Icon
      icon="spinner"
      classes={classNames("spin", className, {
        "spinner-large": large,
      })}
    />
  );
}

export function PurgeWarning() {
  return (
    <div className="purge-warning mt-2 alert alert-danger" role="alert">
      <Icon icon="alert-triangle" classes="icon-inline me-2" />
      {I18NextService.i18n.t("purge_warning")}
    </div>
  );
}
