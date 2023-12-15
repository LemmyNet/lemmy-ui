import { Link } from "@/inferno-router";
import { I18NextService } from "../../../services";
import { Icon } from "../icon";
import { CrossPostParams } from "@utils/types";
import { InfernoNode } from "@/inferno";

export default function CrossPostButton(props: CrossPostParams): InfernoNode {
  return (
    <Link
      className="btn btn-sm btn-link btn-animate text-muted py-0"
      href={{
        pathname: "/create_post",
        // TODO: state: props,
      }}
      title={I18NextService.i18n.t("cross_post")}
      data-tippy-content={I18NextService.i18n.t("cross_post")}
      aria-label={I18NextService.i18n.t("cross_post")}
    >
      <Icon icon="copy" inline />
    </Link>
  );
}
