const fs = require('fs');
const geolite2 = require('geolite2-redist');

geolite2.open('GeoLite2-Country', path => {
  fs.createReadStream(path).pipe(fs.createWriteStream('country-flags/firefox/data/assets/GeoLite2-Country.db'));

  return {};
});
