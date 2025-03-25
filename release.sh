#!/bin/bash

VERSION=`npx semverity bump --tidy`

npx semverity patch --files package.json:version package-lock.json:version,packages..version manifest.json:version --tidy --commit bump $VERSION

git tag $VERSION && git push origin $VERSION
