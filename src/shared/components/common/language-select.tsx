import { selectableLanguages } from "@utils/app";
import { Language, MyUserInfo } from "lemmy-js-client";
import { I18NextService } from "../../services";
import { Icon } from "./icon";
import { FilterChipSelect } from "./filter-chip-select";

type LanguageSelectProps = {
  allLanguages?: Language[];
  siteLanguages?: number[];
  selectedLanguageIds?: number[];
  multiple: boolean;
  showAll?: boolean;
  showSite?: boolean;
  iconVersion?: boolean;
  disabled?: boolean;
  showLanguageWarning?: boolean;
  myUserInfo: MyUserInfo | undefined;
  onChange: (val: number[]) => void;
};

export function LanguageSelect({
  allLanguages,
  siteLanguages,
  selectedLanguageIds,
  multiple,
  showAll,
  showSite,
  disabled,
  showLanguageWarning,
  myUserInfo,
  onChange,
}: LanguageSelectProps) {
  const title = multiple ? "language_plural" : "language";

  const filteredLangs = selectableLanguages(
    allLanguages,
    siteLanguages,
    showAll,
    showSite,
    myUserInfo,
  ).map(l => {
    return { value: l.id.toString(), label: l.name };
  });

  const selectedOptions = (selectedLanguageIds ?? []).map(id => id.toString());

  return (
    <>
      {multiple && showLanguageWarning && (
        <div
          id="lang-warning"
          className="alert small alert-warning"
          role="alert"
        >
          <Icon icon="alert-triangle" classes="icon-inline me-2" />
          {I18NextService.i18n.t("undetermined_language_warning")}
        </div>
      )}
      <FilterChipSelect
        label={title}
        multiple={multiple}
        allOptions={filteredLangs}
        selectedOptions={selectedOptions}
        disabled={disabled}
        onSelect={choices => onChange(choices.map(c => Number(c.value)))}
      />
    </>
  );
}
