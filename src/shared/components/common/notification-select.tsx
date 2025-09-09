import { I18NextService } from "@services/index";
import { Icon } from "./icon";
import { NoOptionI18nKeys } from "i18next";

interface NotificationSelectProps {
  value: string;
  modes: { value: string; i18nKey: NoOptionI18nKeys }[];
  onChange: (event: any) => void;
}

export function NotificationSelect({
  value,
  modes,
  onChange,
}: NotificationSelectProps) {
  return (
    <>
      <Icon icon="bell" classes="m-2" />
      <select value={value} onChange={onChange} className="form-select w-auto">
        {modes.map(mode => (
          <option value={mode.value}>
            {I18NextService.i18n.t(mode.i18nKey)}
          </option>
        ))}
      </select>
    </>
  );
}
