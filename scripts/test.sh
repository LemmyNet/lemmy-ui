#!/bin/bash
set -e

CWD="$(cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
cd "$CWD/../"

export LEMMY_UI_LEMMY_INTERNAL_HOST=0.0.0.0:8536
export LEMMY_UI_LEMMY_EXTERNAL_HOST=voyager.lemmy.ml:8536
export LEMMY_UI_HTTPS=true
export LEMMY_UI_DEBUG=true
pnpm i
pnpm dev
