#!/bin/bash
set -e
mkdir -p dist

scripts/build/buildRpm.sh
scripts/build/buildPostmanCollection.sh
