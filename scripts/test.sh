#!/bin/bash
set -e

CWD="$(cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
cd "$CWD/../"

# Use this to develop on voyager.lemmy.ml
export LEMMY_UI_BACKEND_REMOTE=voyager.lemmy.ml

# Use this to develop locally. Change TEST.TLD to your test server.
# export LEMMY_UI_BACKEND_INTERNAL=0.0.0.0:8536
# export LEMMY_UI_BACKEND_EXTERNAL=TEST.TLD:8536
# export LEMMY_UI_HTTPS=false

pnpm i
pnpm dev
