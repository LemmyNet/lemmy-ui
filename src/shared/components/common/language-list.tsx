import { I18NextService } from "@services/index";
import { Language } from "lemmy-js-client";

interface LanguageListProps {
  allLanguages?: Language[];
  languageIds?: number[];
}

export function LanguageList({ allLanguages, languageIds }: LanguageListProps) {
  const langs = allLanguages?.filter(x => languageIds?.includes(x.id));

  const showLanguages =
    allLanguages && langs && langs.length < allLanguages.length;

  return (
    showLanguages && (
      <div>
        <ul className="badges my-1 list-inline">
          {langs.map(l => (
            <li className="badge text-bg-light list-inline-item">
              {languageName(l)}
            </li>
          ))}
        </ul>
      </div>
    )
  );
}

export function languageName(l: Language): string {
  if (l.id === 0) {
    return I18NextService.i18n.t("unknown_language");
  } else {
    return l.name;
  }
}
