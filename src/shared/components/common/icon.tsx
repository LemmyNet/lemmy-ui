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
  let iconAltText: string | undefined;
  if (icon === "plus-square" || icon === "minus-square") {
    iconAltText = `${I18NextService.i18n.t("show_content")}`;
  }

  return (
    <svg
      className={classNames("icon", classes, {
        "icon-inline": inline,
        small: small,
      })}
      {...(iconAltText
        ? { role: "img", "aria-describedby": `${icon}-alt` }
        : {})}
    >
      {iconAltText && <title id={`${icon}-alt`}>{iconAltText}</title>}
      <use
        xlinkHref={`${getStaticDir()}/assets/symbols.svg#icon-${icon}`}
      ></use>
    </svg>
  );
}

type SpinnerProps = {
  large?: boolean;
  className?: string;
};

export function Spinner({ large, className }: SpinnerProps) {
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
