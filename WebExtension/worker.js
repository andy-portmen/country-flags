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

var global = {
  geodatadir: '/data/assets'
};

var require = path => {
  if (path === 'fs') {
    return {
      openSync(path) {
        return path;
      },
      fstatSync(path) {
        return {
          size: path.indexOf('city') === -1 ? _fs.content[path].byteLength : 0
        };
      },
      readSync(path, obj) {
        obj.path = path;
      },
      closeSync() {}
    };
  }
  else if (path === 'path') {
    return {
      join(...args) {
        return args.join('/');
      }
    };
  }
  else if (path === 'net') {
    const IP4 = /^([01]?[0-9]?[0-9]|2[0-4][0-9]|25[0-5])\.([01]?[0-9]?[0-9]|2[0-4][0-9]|25[0-5])\.([01]?[0-9]?[0-9]|2[0-4][0-9]|25[0-5])\.([01]?[0-9]?[0-9]|2[0-4][0-9]|25[0-5])$/;
    const isIP4 = ip => IP4.test(ip);
    const IP6 = /(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))/;
    const isIP6 = ip => IP6.test(ip);
    return {
      isIP(ip) {
        if (isIP4(ip)) {
          return 4;
        }
        else if (isIP6(ip)) {
          return 6;
        }
      }
    };
  }
  else if (path === 'async' || path === './fsWatcher') {
    return {};
  }
  else if (path === './utils') {
    return module.exports;
  }
};

var _fs = {
  content: {
    '/data/assets/geoip-country.dat': null,
    '/data/assets/geoip-country6.dat': null
  }
};
{
  const keys = Object.keys(_fs.content);
  Promise.all(keys.map(s => fetch(s).then(r => r.arrayBuffer()))).then(arr => {
    keys.forEach((key, i) => _fs.content[key] = arr[i]);

    self.importScripts('vendor/geoip-lite/utils.js');
    self.importScripts('vendor/geoip-lite/geoip.js');

    isLoaded = true;
    requests.forEach(r => perform(r));
    requests = [];
  });
}


var Buffer = {};
Buffer.alloc = () => {
  return {
    readUInt32BE(offset) {
      return new DataView(_fs.content[this.path], offset, 4).getUint32(0);
    },
    toString(encoding, offset) {
      const uint8array = new DataView(_fs.content[this.path], offset, 2);
      return new TextDecoder('utf-8').decode(uint8array);
    }
  };
};


var isLoaded = false;
var requests = [];

self.onmessage = function({data}) {
  if (isLoaded) {
    try {
      self.postMessage(Object.assign(data, module.exports.lookup(data.ip)));
    }
    catch (e) {
      self.postMessage({
        tabId: data.tabId,
        error: e.message
      });
    }
  }
  else {
    requests.push(data);
  }
};
