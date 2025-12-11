#!/usr/bin/env bash

set -euo pipefail

echo "Bundling extension..."
mkdir -p dist/content

cp manifest.json dist/
cp src/*.html dist/
cp -r assets dist/
cp src/content/indicator.css dist/content/

bun run build

echo "Bundle created in dist/"