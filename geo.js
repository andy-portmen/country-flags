/* globals self, utils */
'use strict';

self.importScripts('utils.js');

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

  init4: () => {
    let req = new XMLHttpRequest();
    req.open('GET', './data/assets/geoip-country4.dat');
    req.responseType = 'arraybuffer';
    req.onload = () => {
      geo.cache4.buffer = req.response;
      let size = req.response.byteLength;

      geo.cache4.lastLine = (size / geo.cache4.recordSize) - 1;

      geo.cache4.lastIP = new DataView(
        geo.cache4.buffer,
        (geo.cache4.lastLine * geo.cache4.recordSize) + 4, 4
      ).getUint32(0);
      geo.cache4.firstIP = new DataView(geo.cache4.buffer, 0, 4).getUint32(0);
    };
    req.send();
  },
  init6: () => {
    let req = new XMLHttpRequest();
    req.open('GET', './data/assets/geoip-country6.dat');
    req.responseType = 'arraybuffer';
    req.onload = () => {
      geo.cache6.buffer = req.response;
      let size = req.response.byteLength;

      geo.cache6.lastLine = (size / geo.cache6.recordSize) - 1;

      geo.cache6.lastIP = new DataView(
        geo.cache6.buffer,
        (geo.cache6.lastLine * geo.cache6.recordSize) + 4, 4
      ).getUint32(0);
      geo.cache6.firstIP = new DataView(geo.cache6.buffer, 0, 4).getUint32(0);
    };
    req.send();
  },
  lookup4: (ip) => {
    if (!geo.cache4.buffer) {
      throw Error('cache4.buffer is not ready');
    }

    let fline = 0, cline = geo.cache4.lastLine, floor, ceil, line;
    let recordSize = geo.cache4.recordSize;

    // outside IPv4 range
    if (ip > geo.cache4.lastIP || ip < geo.cache4.firstIP) {
      throw Error('outside IPv4 range');
    }

    for (let k = 0; k < 40; k += 1) {
      line = Math.round((cline - fline) / 2) + fline;
      floor = new DataView(geo.cache4.buffer, line * recordSize).getUint32(0);
      ceil = new DataView(geo.cache4.buffer, (line * recordSize) + 4).getUint32(0);

      if (floor <= ip && ceil >= ip) {
        let uint8array = new DataView(geo.cache4.buffer, (line * recordSize) + 8, 2);
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
  lookup6: (ip) => {
    if (!geo.cache6.buffer) {
      throw Error('cache4.buffer is not ready');
    }
    let recordSize = geo.cache6.recordSize;

    function readip(line, offset) {
      let ii = 0;
      let ip = [];

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
      ceil  = readip(line, 1);

      if (utils.cmp6(floor, ip) <= 0 && utils.cmp6(ceil, ip) >= 0) {
        let uint8array = new DataView(geo.cache6.buffer, (line * recordSize) + 32, 2);
        return (new TextDecoder('utf-8').decode(uint8array)).replace(/\u0000.*/, '');
      }
      else if (fline === cline) {
        return null;
      }
      else if (fline === (cline - 1)) {
        if (line === fline) {
          fline = cline;
        } else {
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

geo.init4();
geo.init6();

self.onmessage = function (obj) {
  try {
    if (obj.data.type === 4) {
      let ip = utils.aton4(obj.data.ip);
      self.postMessage(Object.assign(obj.data, {
        country: geo.lookup4(ip)
      }));
    }
    else {
      let ip = utils.aton6(obj.data.ip);
      self.postMessage(Object.assign(obj.data, {
        country: geo.lookup6(ip)
      }));
    }
  }
  catch (e) {
    self.postMessage(Object.assign(obj.data, {
      error: e.message
    }));
  }
};
