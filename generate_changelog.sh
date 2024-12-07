#!/bin/sh
set -e

# Adding to CHANGELOG.md
git cliff --output CHANGELOG.md
prettier -w CHANGELOG.md
