/* globals utils, countries */
'use strict';

var cache = {};
var lastError;

var useDNS = false;
chrome.storage.local.get({
  dns: false
}, prefs => useDNS = prefs.dns);
chrome.storage.onChanged.addListener(prefs => {
  if (prefs.dns) {
    useDNS = prefs.dns.newValue;
  }
});

var dns = (host, callback) => chrome.runtime.sendNativeMessage('com.add0n.node', {
  permissions: ['dns'],
  script: `
    const dns = require('dns');

    dns.lookup('${host}', (err, address, family) => {
      push({err, address, family});
      done();
    });
  `
}, callback);

function update({hostname, tabId}) {
  if (!hostname) {
    return;
  }
  const obj = cache[hostname];
  if (obj) {
    const country = obj.country;
    let path;
    let title = 'Country Flags & IP Whois\n\n';

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
worker.onmessage = e => {
  cache[e.data.hostname] = e.data;
  update(e.data);
};

function get4mapped(ip) {
  const ipv6 = ip.toUpperCase();
  const v6prefixes = ['0:0:0:0:0:FFFF:', '::FFFF:'];
  for (let i = 0; i < v6prefixes.length; i++) {
    const v6prefix = v6prefixes[i];
    if (ipv6.indexOf(v6prefix) === 0) {
      return ipv6.substring(v6prefix.length);
    }
  }
  return null;
}
console.log(12);
function resolve({ip, tabId, hostname}) {
  console.log(ip, tabId, hostname)
  if (utils.isIP4(ip)) {
    worker.postMessage({
      ip,
      type: 4,
      tabId: tabId,
      hostname
    });
  }
  else if (utils.isIP6(ip)) {
    const ipv4 = get4mapped(ip);
    if (ipv4) {
      worker.postMessage({
        ip: ipv4,
        type: 4,
        tabId: tabId,
        hostname
      });
    }
    else {
      worker.postMessage({
        ip,
        type: 6,
        tabId: tabId,
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
}

chrome.webRequest.onResponseStarted.addListener(details => {
  const ip = details.ip;
  if (!ip) {
    return;
  }
  const hostname = (new URL(details.url)).hostname;
  const obj = cache[hostname];
  if (obj && obj.ip === ip) {
    return;
  }

  if (utils.isPrivate(ip)) {
    const setPrivate = () => {
      cache[hostname] = {
        ip,
        hostname,
        country: 'private'
      };
      update({
        hostname,
        tabId: details.tabId
      });
    };

    if (useDNS) {
      return dns(hostname, resp => {
        if (resp && !resp.err && resp.address) {
          if (utils.isPrivate(resp.address)) {
            setPrivate();
          }
          else {
            resolve({
              ip: resp.address,
              tabId: details.tabId,
              hostname
            });
          }
        }
        else {
          setPrivate();
        }
      });
    }
    setPrivate();
  }
  else {
    resolve({ip, hostname, tabId: details.tabId});
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
  const hostname = (new URL(tab.url)).hostname;
  const obj = cache[hostname];
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

// FAQs & Feedback
chrome.storage.local.get({
  'version': null,
  'faqs': navigator.userAgent.indexOf('Firefox') === -1
}, prefs => {
  const version = chrome.runtime.getManifest().version;

  if (prefs.version ? (prefs.faqs && prefs.version !== version) : true) {
    chrome.storage.local.set({version}, () => {
      chrome.tabs.create({
        url: 'http://add0n.com/country-flags.html?version=' + version +
          '&type=' + (prefs.version ? ('upgrade&p=' + prefs.version) : 'install')
      });
    });
  }
});

{
  const {name, version} = chrome.runtime.getManifest();
  chrome.runtime.setUninstallURL('http://add0n.com/feedback.html?name=' + name + '&version=' + version);
}
