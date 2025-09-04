#!/bin/bash
set -e

ignores="WCAG2AA.Principle1.Guideline1_4.1_4_3.G18.Fail"
base_url="http://192.168.50.60:1234"

test_urls=(
  $base_url
  $base_url/communities
  $base_url/login
  $base_url/search
  $base_url/c/announcements
  $base_url/u/dessalines
  $base_url/post/34286
)

for i in "${test_urls[@]}"; do
  pa11y --ignore="$ignores" "$i"
done
