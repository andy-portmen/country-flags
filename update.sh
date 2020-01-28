#!/bin/sh
# Credit: https://gist.github.com/willprice/e07efd73fb7f13f917ea

setup() {
  git config user.email "travis@travis-ci.org"
  git config user.name "Travis CI"
}

commit() {
  dateAndMonth=`date "+%b %Y"`
  # Stage the modified files in dist/output
  git add -f country-flags/firefox/data/assets/GeoLite2-Country.db
  # Create a new commit with a custom build message
  # with "[skip ci]" to avoid a build loop
  # and Travis build number for reference
  git commit -m "Travis update: $dateAndMonth (Build $TRAVIS_BUILD_NUMBER)" -m "[skip ci]"
}

upload() {
  # Remove existing "origin"
  git remote rm origin
  # Add new "origin" with access token in the git URL for authentication
  git remote add origin https://andy-portmen:${GH_TOKEN}@github.com/andy-portmen/country-flags.git
  git push origin master
}

setup
commit
upload
