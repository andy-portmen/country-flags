const geolite2 = require('geolite2-redist');
geolite2.open('GeoLite2-Country', path => {
  console.log(path);
});
console.log(111);
