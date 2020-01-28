#!/bin/sh

git add -f *.db
git commit -m "Travis update: `date "+%b %Y"` (Build $TRAVIS_BUILD_NUMBER)" -m "[skip ci]" --author="Travis CI <builds@travis-ci.org>"
git push --force https://andy-portmen:${GH_TOKEN}@github.com/andy-portmen/country-flags.git master
