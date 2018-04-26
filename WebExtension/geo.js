/* globals self, utils */
'use strict';

self.importScripts('utils.js');

if (navigator.userAgent.indexOf('Edge') !== -1) {
  var TextDecoder = function() {};
  TextDecoder.prototype.decode = function(uint8Arr) {
    let str = '';
    for (let i = 0; i < uint8Arr.byteLength; i += 1) {
      str += String.fromCharCode(uint8Arr.getInt8(i));
    }
    return str;
  };
}

var geo = {
  cache4: {
    buffer: null,
    recordSize: 10,
    lastLine: 0,
    lastIP: 0,
    firstIP: 0
  },
  cache6: {
    buffer: null,
    recordSize: 34,
    lastLine: 0,
    lastIP: 0,
    firstIP: 0
  },

  init4: () => fetch('/data/assets/geoip-country4.dat')
  .then(r => r.arrayBuffer())
  .then(buffer => {
    geo.cache4.buffer = buffer;
    const size = buffer.byteLength;

    geo.cache4.lastLine = (size / geo.cache4.recordSize) - 1;

    geo.cache4.lastIP = new DataView(
      geo.cache4.buffer,
      (geo.cache4.lastLine * geo.cache4.recordSize) + 4, 4
    ).getUint32(0);
    geo.cache4.firstIP = new DataView(geo.cache4.buffer, 0, 4).getUint32(0);
  }),
  init6: () => fetch('/data/assets/geoip-country6.dat')
  .then(r => r.arrayBuffer())
  .then(buffer => {
    geo.cache6.buffer = buffer;
    const size = buffer.byteLength;

    geo.cache6.lastLine = (size / geo.cache6.recordSize) - 1;

    geo.cache6.lastIP = new DataView(
      geo.cache6.buffer,
      (geo.cache6.lastLine * geo.cache6.recordSize) + 4, 4
    ).getUint32(0);
    geo.cache6.firstIP = new DataView(geo.cache6.buffer, 0, 4).getUint32(0);
  }),
  lookup4: ip => {
    if (!geo.cache4.buffer) {
      throw Error('cache4.buffer is not ready');
    }

    let fline = 0, cline = geo.cache4.lastLine, floor, ceil, line;
    const recordSize = geo.cache4.recordSize;

    // outside IPv4 range
    if (ip > geo.cache4.lastIP || ip < geo.cache4.firstIP) {
      throw Error('outside IPv4 range');
    }

    for (let k = 0; k < 40; k += 1) {
      line = Math.round((cline - fline) / 2) + fline;
      floor = new DataView(geo.cache4.buffer, line * recordSize).getUint32(0);
      ceil = new DataView(geo.cache4.buffer, (line * recordSize) + 4).getUint32(0);

      if (floor <= ip && ceil >= ip) {
        const uint8array = new DataView(geo.cache4.buffer, (line * recordSize) + 8, 2);
        return new TextDecoder('utf-8').decode(uint8array);
      }
      else if (fline === cline) {
        return null;
      }
      else if (fline === cline - 1) {
        if (line === fline) {
          fline = cline;
        }
        else {
          cline = fline;
        }
      }
      else if (floor > ip) {
        cline = line;
      }
      else if (ceil < ip) {
        fline = line;
      }
    }

    return null; // loop error
  },
  lookup6: ip => {
    if (!geo.cache6.buffer) {
      throw Error('cache4.buffer is not ready');
    }
    const recordSize = geo.cache6.recordSize;

    function readip(line, offset) {
      let ii = 0;
      const ip = [];

      for (ii = 0; ii < 2; ii++) {
        ip.push(
          new DataView(geo.cache6.buffer, (line * recordSize) + (offset * 16) + (ii * 4)).getUint32(0)
        );
      }

      return ip;
    }

    geo.cache6.lastIP = readip(geo.cache6.lastLine, 1);
    geo.cache6.firstIP = readip(0, 0);

    let fline = 0;
    let floor = geo.cache6.lastIP;
    let cline = geo.cache6.lastLine;
    let ceil = geo.cache6.firstIP;
    let line;

    if (utils.cmp6(ip, geo.cache6.lastIP) > 0 || utils.cmp6(ip, geo.cache6.firstIP) < 0) {
      return null;
    }

    for (let k = 0; k < 40; k += 1) {
      line = Math.round((cline - fline) / 2) + fline;
      floor = readip(line, 0);
      ceil = readip(line, 1);

      if (utils.cmp6(floor, ip) <= 0 && utils.cmp6(ceil, ip) >= 0) {
        const uint8array = new DataView(geo.cache6.buffer, (line * recordSize) + 32, 2);
        return (new TextDecoder('utf-8').decode(uint8array)).replace(/\u0000.*/, '');
      }
      else if (fline === cline) {
        return null;
      }
      else if (fline === (cline - 1)) {
        if (line === fline) {
          fline = cline;
        }
        else {
          cline = fline;
        }
      }
      else if (utils.cmp6(floor, ip) > 0) {
        cline = line;
      }
      else if (utils.cmp6(ceil, ip) < 0) {
        fline = line;
      }
    }

    return null; // loop error
  }
};

var isLoaded = false;
var requests = [];

var perform = data => {
  try {
    if (data.type === 4) {
      const ip = utils.aton4(data.ip);
      self.postMessage({
        tabId: data.tabId,
        country: geo.lookup4(ip)
      });
    }
    else {
      const ip = utils.aton6(data.ip);
      self.postMessage({
        tabId: data.tabId,
        country: geo.lookup6(ip)
      });
    }
  }
  catch (e) {
    self.postMessage({
      tabId: data.tabId,
      error: e.message
    });
  }
};

Promise.all([geo.init4(), geo.init6()]).then(() => {
  isLoaded = true;
  requests.forEach(r => perform(r));
});

self.onmessage = function({data}) {
  if (isLoaded) {
    perform(data);
    requests.push(data);
  }
};
