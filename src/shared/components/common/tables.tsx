import { I18NextService } from "@services/I18NextService";
import { NoOptionI18nKeys } from "i18next";

export const TableHr = () => <hr className="border border-secondary" />;

type ResponsiveTableRowHeaderProps = {
  title: NoOptionI18nKeys;
};

export function ResponsiveTableRowHeader({
  title,
}: ResponsiveTableRowHeaderProps) {
  return (
    <div className="d-md-none col-6">
      <div className="fw-bold">{I18NextService.i18n.t(title)}</div>
    </div>
  );
}
