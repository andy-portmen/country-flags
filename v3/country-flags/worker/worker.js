'use strict';

{
  const jGeoIPs = [];

  caches.open('cache').then(async cache => {
    // get the latest version of GEO Country database if it is not cached
    const m = 'https://cdn.jsdelivr.net/gh/andy-portmen/country-flags@master/v3/country-flags/data/assets/GeoLite2-Country.db';
    const response = await cache.match(m) || await fetch('/data/assets/GeoLite2-Country.db');

    require.files[0] = await response.arrayBuffer();
    require.files[1] = await fetch('/data/assets/GeoLite2-Country-Old.db').then(r => r.arrayBuffer());

    const GeoIP = require('jgeoip');
    // Load synchronously MaxMind database in memory
    jGeoIPs[0] = new GeoIP(0);
    jGeoIPs[1] = new GeoIP(1);
    require.files = [];

    isLoaded = true;
    requests.forEach(([data, c]) => self.perform(data, c));
    requests = [];

    // cache the request
    if (await cache.match(m) === undefined) {
      try {
        await cache.add(m);
        const response = await cache.match(m);
        require.files[0] = await response.arrayBuffer();
        console.log('new GeoLite2-Country.db', m);
        jGeoIPs[0] = new GeoIP(0);
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
        const obj = jGeoIPs[0].getRecord(data.ip) || jGeoIPs[1].getRecord(data.ip) || {
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
