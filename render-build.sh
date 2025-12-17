#!/usr/bin/env bash
set -euo pipefail
echo "Running render-build.sh: installing and building frontend in CommuniLearn"
cd CommuniLearn
npm ci
npx vite build

echo "Build completed"
