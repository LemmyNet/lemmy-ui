#!/bin/bash
set -e

new_tag="$1"

# Old deploy
# sudo docker build . --tag dessalines/lemmy-ui:$new_tag --platform=linux/amd64 --push

# Upgrade version
yarn version --new-version $new_tag
git push

git tag $new_tag
git push origin $new_tag
