'use strict';

var module = {};
var require = name => {
  if (name === 'fs') {
    return {
      accessSync: () => true,
      readFileSync: () => new Buffer(require.file)
    };
  }
  else if (name === 'jgeoip') {
    return module.exports;
  }
  else {
    throw Error('no module', name);
  }
};

class CUint8Array extends Uint8Array {
  readUInt8(offset) {
    return new DataView(this.buffer, offset, 8).getUint8(0);
  }
  toString(encoding, start, end) {
    const uint8array = new DataView(this.buffer, start, end - start);
    return new TextDecoder(encoding).decode(uint8array);
  }
}

var Buffer = function(a, b) {
  if (b === 'hex') {
    return new CUint8Array(a.match(/[\da-f]{2}/gi).map(h => parseInt(h, 16)));
  }
  return new CUint8Array(a);
};

fetch('./GeoLite2-Country.mmdb').then(r => r.arrayBuffer()).then(r => {
  require.file = r;
  const GeoIP = require('jgeoip');
  // Load synchronously MaxMind database in memory
  const geoip = new GeoIP('');
  // IPV4
  console.log(geoip.getRecord('94.182.181.50'));
  console.log(geoip.getRecord('91.198.174.192'));
  console.log(geoip.getRecord('92.122.146.195'));
  console.log(geoip.getRecord('1.1.1.1'));
  console.log(geoip.getRecord('127.0.0.1')); // unknown
  console.log(geoip.getRecord('111:4860:4860::8888')); // unknown
  console.log(geoip.getRecord('2001:4860:4860::8888')); // Google DNS
  console.log(geoip.getRecord('2620:0:ccc::2')); // OpenDNS
  console.log(geoip.getRecord('2a03:2880:2110:df07:face:b00c::1')); // Facebook
});
