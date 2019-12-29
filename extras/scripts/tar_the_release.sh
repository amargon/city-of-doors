#!/bin/bash

PACKAGE_VERSION=$(grep 'version' package.json -m1 | cut -d '"' -f4)
PACKAGE_NAME=$(grep 'name' package.json -m1 | cut -d '"' -f4)

RELEASE_DIR="release"
RELEASE_TIMESTAMP="$(date +%Y%m%d)"

# Rebuild CE if necessary:
if ! grep -q v$PACKAGE_VERSION build/index.html;
then
    rm -rf build/
    gulp --ce
fi

[ ! -d "$RELEASE_DIR" ] && mkdir -p "$RELEASE_DIR"
tar -zcf $RELEASE_DIR/$PACKAGE_NAME-$PACKAGE_VERSION.tar.gz --transform "s/^build/$PACKAGE_NAME/" build/
