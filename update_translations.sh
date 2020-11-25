#!/bin/bash
pushd ../lemmy-translations
git fetch weblate
git merge weblate/main
git push
popd
git submodule update --remote
git add lemmy-translations
git commit -m"Updating translations."
git push
