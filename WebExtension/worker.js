'use strict';

if (typeof TextDecoder === 'undefined') {
  var TextDecoder = function() {};
  TextDecoder.prototype.decode = function(uint8Arr) {
    let str = '';
    for (let i = 0; i < uint8Arr.byteLength; i += 1) {
      str += String.fromCharCode(uint8Arr.getInt8(i));
    }
    return str;
  };
}

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

var jGeoIP;

var Buffer = function(a, b) {
  if (b === 'hex') {
    return new CUint8Array(a.match(/[\da-f]{2}/gi).map(h => parseInt(h, 16)));
  }
  return new CUint8Array(a);
};

fetch('/data/assets/GeoLite2-Country.mmdb').then(r => r.arrayBuffer()).then(r => {
  require.file = r;

  self.importScripts('vendor/jgeoip/jgeoip.js');

  const GeoIP = require('jgeoip');
  // Load synchronously MaxMind database in memory
  jGeoIP = new GeoIP('');
  isLoaded = true;
  requests.forEach(r => perform(r));
  requests = [];
});

var isLoaded = false;
var requests = [];

var perform = data => {

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
