#!/bin/bash
set -e

new_tag="$1"

# Old deploy
# sudo docker build . --tag dessalines/lemmy-ui:$new_tag --platform=linux/amd64 --push
# sudo docker build . --tag dessalines/lemmy-ui:$new_tag --platform=linux/amd64
# sudo docker push dessalines/lemmy-ui:$new_tag

# Upgrade version
npm version $new_tag
git push

git tag $new_tag
git push origin $new_tag
