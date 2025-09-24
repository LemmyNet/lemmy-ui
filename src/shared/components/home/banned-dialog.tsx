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
    <div className="alert alert-danger text-bg-danger" role="alert">
      <h4 className="alert-heading">{title}</h4>
      <div>{I18NextService.i18n.t("banned_dialog_body")}</div>
    </div>
  );
}
