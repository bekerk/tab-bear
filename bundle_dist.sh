#!/usr/bin/env bash

set -euo pipefail

echo "Bundling extension..."
mkdir -p dist

cp manifest.json dist/
bun run build

echo "Bundle created in dist/"