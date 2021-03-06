const fs = require('fs');
const geolite2 = require('geolite2-redist');
const {exec} = require('child_process');

geolite2.downloadDbs().then(async () => {
  let path;
  try {
    await geolite2.open('GeoLite2-Country', p => {
      path = p;
    });
  }
  catch (e) {}

  fs.stat(path, (err, s) => {
    console.log('File Size', s.size);
    if (s.size > 2 * 1024 * 1024) {
      const stream = fs.createReadStream(path);
      stream.on('end', () => exec('./update.sh', (err, stdout, stderr) => {
        if (err) {
          console.error(err);
        }
        else {
          console.log('stdout', stdout);
          console.log('stderr', stderr);
        }
        process.exit();
      }));
      console.log('Updating GeoLite2-Country.db');
      stream.pipe(fs.createWriteStream('country-flags/firefox/data/assets/GeoLite2-Country.db'));
    }
  });
}).catch(e => console.warn(e));

