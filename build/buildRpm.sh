#!/bin/bash
RELEASE=1
rm -rf node_modules/\@f5devcentral/
npm install --production
rpmbuild -bb --define "main $(pwd)" --define '_topdir %{main}/build/rpmbuild' --define "_release ${RELEASE}" build/f5-decon.spec
