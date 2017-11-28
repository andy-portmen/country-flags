/* globals utils, services */
'use strict';

var _ = id => chrome.i18n.getMessage(id);

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
  // console.log(reason);
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
      title += _('bgErr') + ': ' + obj.error || _('bgErr1');
    }
    else if (country === 'private') {
      path = {
        16: './data/icons/private/16.png',
        32: './data/icons/private/32.png',
        64: './data/icons/private/64.png'
      };
      title += _('bgMSG1');
      title += '\nHost: ' + obj.hostname;
    }
    else {
      path = {
        16: './data/icons/flags/16/' + country + '.png',
        32: './data/icons/flags/32/' + country + '.png',
        64: './data/icons/flags/64/' + country + '.png'
      };
      title += _('bgCountry') + ': ' + _('country_' + country);
      title += '\n' + _('bgHost') + ': ' + obj.hostname;
    }
    title += '\n' + _('bgIP') + ': ' + obj.ip;
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
    tabs[tabId].error = _('bgErr2');
    update(tabId, 'cannot resolve ip');
  }
}

var onResponseStarted = ({ip, tabId, url}) => {
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
    url,
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
};
chrome.webRequest.onResponseStarted.addListener(onResponseStarted, {
  urls: ['<all_urls>'],
  types: ['main_frame']
}, []);

// For HTML5 ajax page loading; like YouTube or GitHub
chrome.webNavigation.onCommitted.addListener(({url, tabId, frameId}) => {
  if (frameId === 0 && tabs[tabId]) {
    const {hostname, ip, country} = tabs[tabId];
    if (url && url.indexOf(hostname) !== -1 && ip && country) {
      update(tabId, 'web navigation');
    }
  }
});
// Firefox only
if (navigator.userAgent.indexOf('Firefox') !== -1) {
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, {id, url}) => {
    if (tabs[id] && url !== tabs[id].url) {
      const {hostname, ip, country} = tabs[id];
      if (url && url.indexOf(hostname) !== -1 && ip && country) {
        tabs[id].url = url;
        update(tabId, 'onUpdated');
      }
    }
  });
}

function open(url, prefs, tab) {
  const prop = {
    url,
    active: !prefs['open-in-background']
  };
  if (prefs['open-adjacent']) {
    prop.index = tab.index + 1;
  }
  chrome.tabs.create(prop);
}

chrome.pageAction.onClicked.addListener(tab => {
  chrome.storage.local.get({
    'ip': 'http://www.tcpiputils.com/browse/ip-address/[ip]',
    'host': 'https://www.tcpiputils.com/browse/domain/[host]',
    'open-in-background': false,
    'open-adjacent': true
  }, prefs => {
    const ip = tabs[tab.id].ip;
    const hostname = (new URL(tab.url)).hostname;

    if (tabs[tab.id] && ip) {
      open(prefs.ip.replace('[ip]', ip).replace('[host]', hostname), prefs, tab);
    }
    else {
      open(prefs.host.replace('[ip]', ip).replace('[host]', hostname), prefs, tab);
    }
  });
});

// context menu
function contexts() {
  const prefs = services.menuitems().reduce((p, c) => {
    p[c] = services.default(c);
    return p;
  }, {});

  chrome.storage.local.get(Object.assign(prefs, {
    'custom-cmd-1': '',
    'custom-cmd-2': '',
    'custom-cmd-3': '',
    'custom-cmd-4': '',
    'custom-cmd-5': '',

    'custom-cmd-1-title': '',
    'custom-cmd-2-title': '',
    'custom-cmd-3-title': '',
    'custom-cmd-4-title': '',
    'custom-cmd-5-title': ''
  }), prefs => {
    const dictionary = Object.assign({
      'custom-cmd-1': prefs['custom-cmd-1-title'] || _('bgCustom1'),
      'custom-cmd-2': prefs['custom-cmd-2-title'] || _('bgCustom2'),
      'custom-cmd-3': prefs['custom-cmd-3-title'] || _('bgCustom3'),
      'custom-cmd-4': prefs['custom-cmd-4-title'] || _('bgCustom4'),
      'custom-cmd-5': prefs['custom-cmd-5-title'] || _('bgCustom5')
    }, services.dictionary);

    const names = services.names
      .filter(id => id !== 'ip' && id !== 'host')
      // do not display custom commands when the URL is not set
      .filter(id => id.startsWith('custom-cmd-') ? prefs[id] : true);
    const items = names.filter(key => prefs[key + '-menuitem']).slice(0, 5);
    items.forEach(id => {
      chrome.contextMenus.create({
        contexts: ['page_action'],
        id,
        title: dictionary[id]
      });
    });
    // other services
    const parentId = chrome.contextMenus.create({
      contexts: ['page_action'],
      title: _('bgOtherServices')
    });
    // change order (everything checked above 5 is located on top of the others menu)
    [
      ...names.filter(id => items.indexOf(id) === -1).filter(key => prefs[key + '-menuitem'] === true),
      ...names.filter(id => items.indexOf(id) === -1).filter(key => prefs[key + '-menuitem'] === false)
    ].forEach(id => {
      chrome.contextMenus.create({
        contexts: ['page_action'],
        id,
        title: dictionary[id],
        parentId
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
          _('bgErr3') :
          _('bgMSG2')
      );
    });
  }
  else {
    document.oncopy = e => {
      e.clipboardData.setData('text/plain', str);
      e.preventDefault();
      notify(_('bgMSG2'));
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
      notify(_('bgErr4'));
    }
    return;
  }

  chrome.storage.local.get(Object.assign({
    'open-in-background': false,
    'open-adjacent': true
  }, services.urls), prefs => {
    let url = prefs[info.menuItemId]
      .replace('[lang]', chrome.i18n.getUILanguage())
      .replace('[url]', tab.url)
      .replace('[enurl]', encodeURIComponent(tab.url));

    if (url.indexOf('[host]') !== -1) {
      const hostname = (new URL(tab.url)).hostname;
      url = url.replace('[host]', hostname);
    }
    if (url.indexOf('[curl]') !== -1) {
      const curl = tab.url.split('?')[0].split('#')[0];
      url = url.replace('[curl]', curl);
    }
    if (url.indexOf('[ip]') !== -1) {
      if (tabs[tab.id] && tabs[tab.id].ip) {
        url = url.replace('[ip]', tabs[tab.id].ip);
      }
      else {
        return notify(_('bgErr4'));
      }
    }
    open(url, prefs, tab);
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
      if (prefs.version === '0.2.2') {
        return;
      }
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
