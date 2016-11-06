/* globals self, utils */
'use strict';

self.importScripts('utils.js');

var geo = {
  buffer: null,
  size: 0,
  cache4: {
    recordSize: 10,
    lastLine: 0,
    lastIP: 0,
    firstIP: 0
  },

  init: () => {
    let req = new XMLHttpRequest();
    req.open('GET', './data/assets/geoip-country.dat');
    req.responseType = 'arraybuffer';
    req.onload = () => {
      geo.buffer = req.response;
      geo.size = req.response.byteLength;

      geo.cache4.lastLine = (geo.size / geo.cache4.recordSize) - 1;

      geo.cache4.lastIP = new DataView(geo.buffer, (geo.cache4.lastLine * geo.cache4.recordSize) + 4, 4).getUint32(0);
      geo.cache4.firstIP = new DataView(geo.buffer, 0, 4).getUint32(0);
    };
    req.send();
  },
  lookup4: (ip) => {
    if (!geo.buffer) {
      throw Error('buffer is not ready');
    }

    let fline = 0, cline = geo.cache4.lastLine, floor, ceil, line;
    let recordSize = geo.cache4.recordSize;

    // outside IPv4 range
    if (ip > geo.cache4.lastIP || ip < geo.cache4.firstIP) {
      throw Error('outside IPv4 range');
    }

    do {
      line = Math.round((cline - fline) / 2) + fline;
      floor = new DataView(geo.buffer, line * recordSize).getUint32(0);
      ceil = new DataView(geo.buffer, (line * recordSize) + 4).getUint32(0);

      if (floor <= ip && ceil >= ip) {
        let uint8array = new DataView(geo.buffer, (line * recordSize) + 8, 2);
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
    } while(1);
  }
};

geo.init();

self.onmessage = function(obj) {
  let ip = utils.aton4(obj.data.ip);
  try {
    self.postMessage(Object.assign(obj.data, {
      country: geo.lookup4(ip)
    }));
  }
  catch (e) {
    self.postMessage(Object.assign(obj.data, {
      error: e.message
    }));
  }
};
