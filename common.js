/* globals utils, countries */
'use strict';

var cache = {};

function update ({hostname, tabId}) {
  let obj = cache[hostname];
  if (obj) {
    let country = obj.country, path, title = 'Country Flags & IP Whois\n\n';

    if (obj.error || !country) {
      path = {
        16: './data/icons/error/16.png',
        32: './data/icons/error/32.png',
        64: './data/icons/error/64.png'
      };
      title += 'Error: ' + obj.error || 'obj.country is null';
    }
    else if (country === 'private') {
      path = {
        16: './data/icons/private/16.png',
        32: './data/icons/private/32.png',
        64: './data/icons/private/64.png'
      };
      title += 'Server is on your private network';
      title += '\nHost: ' + hostname;
    }
    else {
      path = {
        16: './data/icons/flags/16/' + country + '.png',
        32: './data/icons/flags/32/' + country + '.png',
        64: './data/icons/flags/64/' + country + '.png'
      };
      title += 'Country: ' + countries[country];
      title += '\nHost: ' + hostname;
    }
    title += '\nServer IP: ' + obj.ip;
    //
    chrome.pageAction.setIcon({tabId, path});
    chrome.pageAction.setTitle({title, tabId});
    chrome.pageAction.show(tabId);
  }
}

var worker = new Worker('./geo.js');
worker.onmessage = (e) => {
  cache[e.data.hostname] = e.data;
};

chrome.webRequest.onResponseStarted.addListener(details => {
  let ip = details.ip;
  if (!ip) {
    return;
  }
  let hostname = (new URL(details.url)).hostname;
  if (utils.isIP4(ip)) {
    if (utils.isPrivate(ip)) {
      cache[hostname] = {
        ip,
        hostname,
        country: 'private'
      };
    }
    else {
      let obj = cache[hostname];
      if (!obj || obj.country === 'private') {
        console.error(details);
        worker.postMessage({
          ip: details.ip,
          tabId: details.tabId,
          hostname
        });
      }
    }
  }
  else {
    cache[hostname] = {
      ip,
      hostname,
      error: 'only IP4 is currently supported'
    };
  }
}, {
  urls: ['<all_urls>'],
  types: ['main_frame']
}, []);

// For HTML5 ajax page loading; like YouTube or GitHub (Firefox ONLY)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  console.error(tabId, changeInfo, tab);
  update({
    tabId,
    hostname: (new URL(tab.url)).hostname
  });
});


chrome.pageAction.onClicked.addListener(tab => {
  let hostname = (new URL(tab.url)).hostname;
  let obj = cache[hostname];
  if (obj) {
    chrome.tabs.create({
      url: 'https://isc.sans.edu/ipinfo.html?ip=' + obj.ip
    });
  }
  else {
    chrome.notifications.create({
      iconUrl: './data/icons/48.png',
      message: 'Cannot find IP address of this tab. Please refresh',
      type: 'basic'
    });
  }
});

chrome.storage.local.get('version', (obj) => {
  let version = chrome.runtime.getManifest().version;
  if (obj.version !== version) {
    window.setTimeout(() => {
      chrome.storage.local.set({version}, () => {
        chrome.tabs.create({
          url: 'http://add0n.com/country-flags.html?version=' + version + '&type=' + (obj.version ? ('upgrade&p=' + obj.version) : 'install')
        });
      });
    }, 3000);
  }
});
