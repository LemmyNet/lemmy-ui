import { Language } from "lemmy-js-client";

export function renderLanguageList(
  allLanguages?: Language[],
  languageIds?: number[],
) {
  const langs = allLanguages
    ?.filter(x => languageIds?.includes(x.id))
    .map(x => x.name);
  const showLanguages =
    allLanguages && langs && langs.length < allLanguages.length;

  return (
    showLanguages && (
      <div>
        <ul class="badges my-1 list-inline">
          {langs.map(l => (
            <li class="badge list-inline-item text-secondary border border-secondary">
              {l}
            </li>
          ))}
        </ul>
      </div>
    )
  );
}
