#!/bin/sh

git checkout master
git add *.db
git commit -am "Travis update: `date "+%b %Y"` (Build $TRAVIS_BUILD_NUMBER)" -m "[skip ci]" --author="Travis CI <builds@travis-ci.org>"
git push --force https://andy-portmen:${GH_TOKEN}@github.com/andy-portmen/country-flags.git master

echo "Updates pushed to GitHub remote"
exit 0
