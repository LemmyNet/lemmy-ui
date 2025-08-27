#!/bin/bash
set -e

CWD="$(cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
cd "$CWD/../"

sudo docker build . --tag dessalines/lemmy-ui:dev
sudo docker push dessalines/lemmy-ui:dev
