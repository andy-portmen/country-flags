/* globals utils, countries */
'use strict';

var cache = {};
var lastError;

function update ({hostname, tabId}) {
  if (!hostname) {
    return;
  }
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
    chrome.pageAction.setIcon({tabId, path}, () => lastError = chrome.runtime.lastError);
    chrome.pageAction.setTitle({title, tabId});
    chrome.pageAction.show(tabId);
  }
}

var worker = new Worker('./geo.js');
worker.onmessage = (e) => {
  cache[e.data.hostname] = e.data;
  update(e.data);
};

function get4mapped (ip) {
  let ipv6 = ip.toUpperCase();
  let v6prefixes = ['0:0:0:0:0:FFFF:', '::FFFF:'];
  for (let i = 0; i < v6prefixes.length; i++) {
    let v6prefix = v6prefixes[i];
    if (ipv6.indexOf(v6prefix) === 0) {
      return ipv6.substring(v6prefix.length);
    }
  }
  return null;
}

chrome.webRequest.onResponseStarted.addListener(details => {
  let ip = details.ip;
  if (!ip) {
    return;
  }
  let hostname = (new URL(details.url)).hostname;
  let obj = cache[hostname];
  if (obj && obj.ip === ip) {
    return;
  }
  if (utils.isIP4(ip)) {
    if (utils.isPrivate(ip)) {
      cache[hostname] = {
        ip,
        hostname,
        country: 'private'
      };
    }
    else {
      worker.postMessage({
        ip,
        type: 4,
        tabId: details.tabId,
        hostname
      });
    }
  }
  else if (utils.isIP6(ip)) {
    let ipv4 = get4mapped(ip);
    if (ipv4) {
      worker.postMessage({
        ip: ipv4,
        type: 4,
        tabId: details.tabId,
        hostname
      });
    }
    else {
      worker.postMessage({
        ip,
        type: 6,
        tabId: details.tabId,
        hostname
      });
    }
  }
  else {
    cache[hostname] = {
      ip,
      hostname,
      error: 'cannot resolve the IP'
    };
  }
}, {
  urls: ['<all_urls>'],
  types: ['main_frame']
}, []);

// For HTML5 ajax page loading; like YouTube or GitHub
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.favIconUrl || changeInfo.url) {
    update({
      tabId,
      hostname: (new URL(tab.url)).hostname
    });
  }
});

chrome.pageAction.onClicked.addListener(tab => {
  let hostname = (new URL(tab.url)).hostname;
  let obj = cache[hostname];
  if (obj) {
    chrome.tabs.create({
      url: 'http://www.tcpiputils.com/browse/ip-address/' + obj.ip
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
          url: 'http://add0n.com/country-flags.html?version=' + version +
            '&type=' + (obj.version ? ('upgrade&p=' + obj.version) : 'install')
        });
      });
    }, 3000);
  }
});
