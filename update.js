const fs = require('fs');
const geolite2 = require('geolite2-redist');

geolite2.open('GeoLite2-Country', path => {
  fs.stat(path, (err, s) => {
    console.log('File Size', s.size);
    if (s.size > 2 * 1024 * 1024) {
      fs.createReadStream(path).pipe(fs.createWriteStream('country-flags/firefox/data/assets/GeoLite2-Country.db'));
      console.log('Updating GeoLite2-Country.db');
    }
  });
  return {};
});
