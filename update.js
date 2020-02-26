const fs = require('fs');
const geolite2 = require('geolite2-redist');

geolite2.open('GeoLite2-Country', path => {
  fs.stat(path, (err, s) => {
    console.log('File Size', s.size);
    if (s.size > 2 * 1024 * 1024) {
      console.log('Updating the DB');
      fs.createReadStream(path).pipe(fs.createWriteStream('country-flags/firefox/data/assets/GeoLite2-Country.db'));
    }
  });
  return {};
});
