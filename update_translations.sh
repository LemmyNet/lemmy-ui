#!/bin/bash
pushd ../lemmy-translations || exit
git fetch weblate
git merge weblate/main
git push
popd || exit

# look for unused translations
for langfile in lemmy-translations/translations/*.json; do
    lang=$(basename $langfile .json)
    if ! grep -q "\"./translations/$lang\"" src/shared/i18next.ts; then
      echo "Unused language $lang"
    fi
done

git submodule update --remote
git add lemmy-translations
git commit -m"Updating translations."
git push
