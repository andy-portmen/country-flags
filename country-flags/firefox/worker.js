'use strict';

if (typeof TextDecoder === 'undefined') {
  const TextDecoder = function() {};
  TextDecoder.prototype.decode = function(uint8Arr) {
    let str = '';
    for (let i = 0; i < uint8Arr.byteLength; i += 1) {
      str += String.fromCharCode(uint8Arr.getInt8(i));
    }
    return str;
  };
}

const module = {};
const require = name => {
  if (name === 'fs') {
    return {
      accessSync: () => true,
      readFileSync() {
        return new Buffer(require.file);
      }
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

let jGeoIP;

const Buffer = function(a, b) {
  if (b === 'hex') {
    return new CUint8Array(a.match(/[\da-f]{2}/gi).map(h => parseInt(h, 16)));
  }
  return new CUint8Array(a);
};

caches.open('cache').then(async cache => {
  // get the latest version of GEO Country database if it is not cached
  const m = 'https://cdn.jsdelivr.net/gh/andy-portmen/country-flags@master/country-flags/firefox/data/assets/GeoLite2-Country.db';
  const response = await cache.match(m) || await fetch('/data/assets/GeoLite2-Country.db');
  require.file = await response.arrayBuffer();

  self.importScripts('vendor/jgeoip/jgeoip.js');

  const GeoIP = require('jgeoip');
  // Load synchronously MaxMind database in memory
  jGeoIP = new GeoIP('');
  isLoaded = true;
  requests.forEach(r => perform(r));
  requests = [];
  // cache the request
  if (await cache.match(m) === undefined) {
    try {
      await cache.add(m);
      const response = await cache.match(m);
      require.file = await response.arrayBuffer();
      console.log('GeoLite2-Country.db updated');
      jGeoIP = new GeoIP('');
    }
    catch (e) {
      console.warn('database updating is failed', e);
    }
  }
});

fetch('https://raw.githubusercontent.com/GitSquared/node-geolite2-redist/master/redist/GeoLite2-Country.tar.gz')
  .then(r => r.arrayBuffer())
  .then(ab => {
    self.importScripts('vendor/pako_inflate.js');
    console.log(pako.inflate(ab));
  });

let isLoaded = false;
let requests = [];

const perform = data => {
  try {
    const obj = jGeoIP.getRecord(data.ip) || {
      error: 'Cannot resolve this IP'
    };
    self.postMessage(Object.assign(obj, data));
  }
  catch (e) {
    console.error(e);
    self.postMessage({
      tabId: data.tabId,
      error: e.message
    });
  }
};
self.onmessage = function({data}) {
  if (isLoaded) {
    perform(data);
  }
  else {
    requests.push(data);
  }
};
