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

var notify = message => chrome.notifications.create(null, {
  type: 'basic',
  iconUrl: '/data/icons/48.png',
  title: 'Country Flags & IP Whois',
  message
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
if (navigator.userAgent.indexOf('Firefox') === -1) {
  chrome.webNavigation.onCommitted.addListener(({url, tabId, frameId}) => {
    if (frameId === 0) {
      if (tabs[tabId]) {
        const {hostname, ip, country} = tabs[tabId];
        if (url && url.indexOf(hostname) !== -1 && ip && country) {
          update(tabId, 'web navigation');
        }
      }
    }
  });
}
// Firefox only
else {
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, {id, url}) => {
    if (changeInfo.favIconUrl || changeInfo.url) {
      if (tabs[id]) {
        const {hostname, ip, country} = tabs[id];
        if (url && url.indexOf(hostname) !== -1 && ip && country) {
          update(tabId, 'web navigation');
        }
      }
    }
  });
}

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

// context menu
function contexts() {
  chrome.storage.local.get({
    'ssl-checker-menuitem': true,
    'trace-route-menuitem': true,
    'ping-menuitem': true,
    'tinyurl-menuitem': true,
    'dns-lookup-menuitem': false,
    'whois-lookup-menuitem': true,
    'http-headers-menuitem': false,
    'copy-ip-menuitem': true,
    'custom-cmd-1-menuitem': false,
    'custom-cmd-1-title': '',
    'custom-cmd-2-menuitem': false,
    'custom-cmd-2-title': ''
  }, prefs => {
    const dictionary = {
      'ssl-checker': 'SSL Checker: Check SSL certificate',
      'trace-route': 'Traceroute: Display the route and transit delays of packets',
      'ping': 'Ping: Test the reachability of this IP address',
      'tinyurl': 'TinyURL: Shorten the URL using TinyURL.com',
      'dns-lookup': 'DNS Lookup: Perform an authoritative DNS lookup',
      'whois-lookup': 'Whois Lookup: Find the registration and delegation of a domain name',
      'http-headers': 'HTTP Headers: List all the response HTTP headers',
      'copy-ip': 'Copy IP: Copy IP address to the clipboard',
      'custom-cmd-1': prefs['custom-cmd-1-title'] || 'Custom command 1',
      'custom-cmd-2': prefs['custom-cmd-2-title'] || 'Custom command 2'
    };
    Object.keys(prefs)
      .filter(key => key.endsWith('-menuitem'))
      .filter(key => prefs[key]).forEach(key => {
        const id = key.replace('-menuitem', '');
        chrome.contextMenus.create({
          contexts: ['page_action'],
          id,
          title: dictionary[id]
        });
    });
  });
}
contexts();
chrome.runtime.onMessage.addListener(request => {
  if (request.method === 'contexts') {
    contexts();
  }
});

function copy(str, tabId) {
  if (/Firefox/.test(navigator.userAgent)) {
    chrome.tabs.executeScript(tabId, {
      allFrames: false,
      runAt: 'document_start',
      code: `
        document.oncopy = (event) => {
          event.clipboardData.setData('text/plain', '${str}');
          event.preventDefault();
        };
        window.focus();
        document.execCommand('Copy', false, null);
      `
    }, () => {
      notify(
        chrome.runtime.lastError ?
          'Cannot copy to the clipboard on this page!' :
          'IP address is stored to the clipboard'
      );
    });
  }
  else {
    document.oncopy = e => {
      e.clipboardData.setData('text/plain', str);
      e.preventDefault();
      notify('IP address is stored to the clipboard');
    };
    document.execCommand('Copy', false, null);
  }
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'copy-ip') {
    if (tabs[tab.id] && tabs[tab.id].ip) {
      copy(tabs[tab.id].ip, tab.id);
    }
    else {
      notify('Cannot find IP address for this tab. Refresh may help!');
    }
    return;
  }

  chrome.storage.local.get({
    'ssl-checker': 'https://www.sslshopper.com/ssl-checker.html#hostname=[host]',
    'trace-route': 'https://api.hackertarget.com/mtr/?q=[ip]',
    'ping': 'https://api.hackertarget.com/nping/?q=[ip]',
    'tinyurl': 'https://tinyurl.com/create.php?url=[url]',
    'dns-lookup': 'https://api.hackertarget.com/dnslookup/?q=[host]',
    'whois-lookup': 'https://api.hackertarget.com/whois/?q=[ip]',
    'http-headers': 'https://api.hackertarget.com/httpheaders/?q=[url]',
    'custom-cmd-1': '',
    'custom-cmd-2': '',
    'open-in-background': false,
    'open-adjacent': true
  }, prefs => {
    let url = prefs[info.menuItemId];
    if (url.indexOf('[host]') !== -1) {
      const hostname = (new URL(tab.url)).hostname;
      url = url.replace('[host]', hostname);
    }
    if (url.indexOf('[url]') !== -1) {
      url = url.replace('[url]', tab.url);
    }
    if (url.indexOf('[ip]') !== -1) {
      if (tabs[tab.id] && tabs[tab.id].ip) {
        url = url.replace('[ip]', tabs[tab.id].ip);
      }
      else {
        return notify('Cannot find IP address for this tab. Refresh may help!');
      }
    }
    const prop = {
      url,
      active: !prefs['open-in-background']
    };
    if (prefs['open-adjacent']) {
      prop.index = tab.index + 1;
    }
    chrome.tabs.create(prop);
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
