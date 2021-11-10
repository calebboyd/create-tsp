#!/bin/bash
set -euo pipefail
IFS=$'\n\t'

rm -rf node_modules
rm -rf package-lock.json

npx npm-check-updates -u
npm i
npm version patch --force
git push
git push --tags