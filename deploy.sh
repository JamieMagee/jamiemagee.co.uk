#!/bin/bash
set -e
if [ "$TRAVIS_BRANCH" == "master" ]; then
  zip -r website.zip _site

  curl -H "Content-Type: application/zip" \
      -H "Authorization: Bearer $API_KEY" \
      --data-binary "@website.zip" \
      https://api.netlify.com/api/v1/sites/"$SITE_ID"/deploys
fi