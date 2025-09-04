#!/bin/sh
set -e

CWD="$(cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
cd "$CWD/../"

# Adding to CHANGELOG.md
git cliff --output CHANGELOG.md
prettier -w CHANGELOG.md
