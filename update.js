const fs = require('fs');
fs.readdir('/home/travis/build/andy-portmen/country-flags/node_modules/geolite2-redist/dbs', function(err, items) {
  console.log(err, items);
});


const geolite2 = require('geolite2-redist');
geolite2.open('GeoLite2-Country', path => {
  console.log(path);
});
console.log(111);


