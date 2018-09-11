#!/bin/sh
RELEASE=1
rpmbuild -bb --define "main $(pwd)" --define '_topdir %{main}/rpmbuild' --define "_release ${RELEASE}" build/f5-decon.spec
