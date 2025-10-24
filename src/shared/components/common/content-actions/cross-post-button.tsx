import { Link } from "inferno-router";
import { I18NextService } from "../../../services";
import { Icon } from "../icon";
import { CrossPostParams } from "@utils/types";
import { InfernoNode } from "inferno";

export default function CrossPostButton(props: CrossPostParams): InfernoNode {
  const label = I18NextService.i18n.t("cross_post");
  return (
    <Link
      className="btn btn-link d-flex align-items-center rounded-0 dropdown-item"
      to={{
        pathname: "/create_post",
        state: props,
      }}
      title={label}
      data-tippy-content={label}
      aria-label={label}
    >
      <Icon icon="copy" classes="me-2" inline />
      {label}
    </Link>
  );
}
