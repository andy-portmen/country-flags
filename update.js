const fs = require('fs');
const maxmind = require('maxmind');

let path;
import('geolite2-redist').then(geolite2 => {
  return geolite2.open('GeoLite2-Country', dbPath => {
    path = dbPath;
    return maxmind.open(dbPath);
  });
}).then(reader => {
  fs.stat(path, async (err, s) => {
    if (err) {
      console.error(err);
      reader.close();
    }
    if (s.size > 2 * 1024 * 1024) {
      const stream = fs.createReadStream(path);

      console.info('Updating GeoLite2-Country.db');
      await stream.pipe(fs.createWriteStream('v3/country-flags/data/assets/GeoLite2-Country.db'));
      await stream.pipe(fs.createWriteStream('v3/server-ip/data/assets/GeoLite2-Country.db'));

      reader.close();
    }
    else {
      console.error('FILE_TOO_SMALL');
      reader.close();
    }
  });
});
