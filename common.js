/* globals utils, countries */
'use strict';

var lastError;
var tabs = {};
chrome.tabs.onRemoved.addListener(tabId => delete tabs[tabId]);

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

function update(tabId, reason) {
  console.log('updating', tabId, reason);
  const obj = tabs[tabId];
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
      title += '\nHost: ' + obj.hostname;
    }
    else {
      path = {
        16: './data/icons/flags/16/' + country + '.png',
        32: './data/icons/flags/32/' + country + '.png',
        64: './data/icons/flags/64/' + country + '.png'
      };
      title += 'Country: ' + countries[country];
      title += '\nHost: ' + obj.hostname;
    }
    title += '\nServer IP: ' + obj.ip;
    //
    chrome.pageAction.setIcon({tabId, path}, () => lastError = chrome.runtime.lastError);
    chrome.pageAction.setTitle({title, tabId});
    lastError = chrome.runtime.lastError;
    chrome.pageAction.show(tabId);
    lastError = chrome.runtime.lastError;
  }
}

var worker = new Worker('./geo.js');
worker.onmessage = ({data}) => {
  const {tabId, country, error} = data;
  if (error) {
    tabs[tabId].error = error;
  }
  if (country) {
    tabs[tabId].country = country;
  }

  update(tabId, 'IP resolved');
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

function resolve(tabId) {
  const {ip} = tabs[tabId];
  if (utils.isIP4(ip)) {
    worker.postMessage({tabId, ip, type: 4});
  }
  else if (utils.isIP6(ip)) {
    const ipv4 = get4mapped(ip);
    if (ipv4) {
      worker.postMessage({tabId, ip: ipv4, type: 4});
    }
    else {
      worker.postMessage({tabId, ip, type: 6});
    }
  }
  else {
    tabs[tabId].error = 'cannot resolve the IP';
    update(tabId, 'cannot resolve ip');
  }
}

chrome.webRequest.onResponseStarted.addListener(({ip, tabId, url}) => {
  if (!ip) {
    return;
  }
  const hostname = (new URL(url)).hostname;

  if (tabs[tabId]) {
    if (ip === tabs[tabId].ip && hostname === tabs[tabId].hostname) {
      return;
    }
  }
  tabs[tabId] = {
    hostname,
    ip
  };

  const set = (obj, doUpdate = false, doResolve) => {
    Object.assign(tabs[tabId], obj);
    if (doUpdate) {
      update(tabId, 'private address');
    }
    if (doResolve) {
      resolve(tabId);
    }
  };
  if (utils.isPrivate(ip)) {
    if (useDNS) {
      return dns(hostname, resp => {
        if (resp && !resp.err && resp.address) {
          if (utils.isPrivate(resp.address)) {
            set({country: 'private'}, true);
          }
          else {
            set({ip: resp.address}, false, true);
          }
        }
        else {
          set({country: 'private'}, true);
        }
      });
    }
    set({country: 'private'}, true);
  }
  else {
    set({ip}, false, true);
  }
}, {
  urls: ['<all_urls>'],
  types: ['main_frame']
}, []);

// For HTML5 ajax page loading; like YouTube or GitHub
chrome.webNavigation.onCommitted.addListener(({url, tabId, frameId}) => {
  if (frameId === 0) {
    if (tabs[tabId]) {
      const {hostname, ip} = tabs[tabId];
      if (url && url.indexOf(hostname) !== -1 && ip) {
        update(tabId, 'web navigation');
      }
    }
  }
});

chrome.pageAction.onClicked.addListener(tab => {
  chrome.storage.local.get({
    ip: 'http://www.tcpiputils.com/browse/ip-address/[ip]',
    host: 'https://www.tcpiputils.com/browse/domain/[host]'
  }, prefs => {
    if (tabs[tab.id] && tabs[tab.id].ip) {
      chrome.tabs.create({
        url: prefs.ip.replace('[ip]', tabs[tab.id].ip)
      });
    }
    else {
      chrome.tabs.create({
        url: prefs.host.replace('[host]', (new URL(tab.url)).hostname)
      });
    }
  });
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
