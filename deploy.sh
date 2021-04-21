#!/bin/bash
set -e

new_tag="$1"

# Old deploy
# sudo docker build . --tag dessalines/lemmy-ui:$new_tag
# sudo docker push dessalines/lemmy-ui:$new_tag

git tag $new_tag
git push origin $new_tag
