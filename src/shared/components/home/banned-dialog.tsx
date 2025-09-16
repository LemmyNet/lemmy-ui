import { I18NextService } from "@services/index";
import { formatRelativeDate } from "@utils/date";

interface BannedDialogProps {
  expires: string | undefined;
}

export function BannedDialog({ expires }: BannedDialogProps) {
  const title = expires
    ? I18NextService.i18n.t("banned_dialog_title_temporary", {
        expires: formatRelativeDate(expires),
      })
    : I18NextService.i18n.t("banned_dialog_title_permanent");
  return (
    <div class="alert alert-danger" role="alert">
      <div class="d-flex">
        <h4 class="alert-heading flex-grow-1">{title}</h4>
      </div>
      <div class="card-text">{I18NextService.i18n.t("banned_dialog_body")}</div>
    </div>
  );
}
