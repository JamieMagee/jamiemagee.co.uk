#!/bin/bash
set -e

if [ "$TRAVIS_BRANCH" == "master" ]; then
  ncftp -u "$USERNAME" -p "$PASSWORD" "$HOST"<<EOF
  rm -rf site/wwwroot
  mkdir site/wwwroot
  quit
EOF
  cd _site || exit
  ncftpput -R -v -u "$USERNAME" -p "$PASSWORD" "$HOST" /site/wwwroot .
fi