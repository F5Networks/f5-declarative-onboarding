#!/bin/bash
VERSION=$(npm version | grep f5-decon | cut -d : -f 2 | awk -F \' '{print $2}')
RELEASE=1
rm -rf node_modules
npm install --production
rpmbuild -bb --define "main $(pwd)" --define '_topdir %{main}/build/rpmbuild' --define "_version ${VERSION}" --define "_release ${RELEASE}" build/f5-decon.spec
