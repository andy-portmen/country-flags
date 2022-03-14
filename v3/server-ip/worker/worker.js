'use strict';

{
  let jGeoIP;

  caches.open('cache').then(async cache => {
    // get the latest version of GEO Country database if it is not cached
    const m = 'https://cdn.jsdelivr.net/gh/andy-portmen/country-flags@master/v3/country-flags/data/assets/GeoLite2-Country.db';
    const response = await cache.match(m) || await fetch('/data/assets/GeoLite2-Country.db');

    require.file = await response.arrayBuffer();

    const GeoIP = require('jgeoip');
    // Load synchronously MaxMind database in memory
    jGeoIP = new GeoIP('');
    isLoaded = true;
    requests.forEach(([data, c]) => self.perform(data, c));
    requests = [];

    // cache the request
    if (await cache.match(m) === undefined) {
      try {
        await cache.add(m);
        const response = await cache.match(m);
        require.file = await response.arrayBuffer();
        console.warn('GeoLite2-Country.db updated', m);
        jGeoIP = new GeoIP('');
      }
      catch (e) {
        console.warn('database updating is failed', e);
      }
    }
  });

  let isLoaded = false;
  let requests = [];

  self.perform = (data, c) => {
    if (isLoaded) {
      try {
        const obj = jGeoIP.getRecord(data.ip) || {
          error: 'Cannot resolve this IP'
        };
        c(Object.assign(obj, data));
      }
      catch (e) {
        c({
          tabId: data.tabId,
          error: e.message
        });
      }
    }
    else {
      requests.push([data, c]);
    }
  };
}
