#!/bin/bash
set -e
mkdir -p dist
VERSION_RELEASE=$(npm version | grep f5-declarative-onboarding | cut -d : -f 2 | awk -F \' '{print $2}')
VERSION=$(echo $VERSION_RELEASE | cut -d - -f 1)
RELEASE=$(echo $VERSION_RELEASE | cut -d - -f 2)
RPM_NAME=f5-declarative-onboarding-${VERSION}-${RELEASE}.noarch.rpm
npm ci --production --no-optional
rpmbuild -bb \
    --define "main $(pwd)" \
    --define '_topdir %{main}/build' \
    --define "_version ${VERSION}" \
    --define "_release ${RELEASE}" \
    scripts/build/f5-declarative-onboarding.spec
pushd build/RPMS/noarch
sha256sum ${RPM_NAME} > ${RPM_NAME}.sha256
OUTPUT=$(ls -t *.rpm 2>/dev/null | head -1)
cp ${OUTPUT} ../../../dist/
cp ${OUTPUT}.sha256 ../../../dist/
popd
#rm -rf build/*
