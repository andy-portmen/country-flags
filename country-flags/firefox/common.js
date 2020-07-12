/* globals services, browser */
'use strict';

const _ = id => chrome.i18n.getMessage(id);

const tabs = {};
chrome.tabs.onRemoved.addListener(tabId => delete tabs[tabId]);

// use in case ip is not resolved by top_frame request
const xDNS = href => new Promise((resolve, reject) => {
  const {hostname, origin} = new URL(href);
  if (typeof browser !== 'undefined' && browser.dns) {
    return browser.dns.resolve(hostname).then(d => resolve({
      ip: d.addresses[0],
      url: href
    }), reject);
  }

  const controller = new AbortController();
  const signal = controller.signal;
  const done = (d, e) => {
    controller.abort();
    clearTimeout(id);
    chrome.webRequest.onResponseStarted.removeListener(init);
    if (e) {
      reject(e);
    }
    else {
      resolve(d);
    }
  };
  const init = d => done(d);
  const id = setTimeout(() => done(null, Error('timeout')), 5000);
  chrome.webRequest.onResponseStarted.addListener(init, {
    urls: [origin + '/*'],
    types: ['xmlhttprequest']
  }, []);

  fetch(href, {
    cache: 'no-cache',
    signal
  }).then(r => r.text()).catch(e => done(null, e));
});

const isPrivate = (() => {
  const rs = [
    /^10\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})/,
    /^192\.168\.([0-9]{1,3})\.([0-9]{1,3})/,
    /^172\.16\.([0-9]{1,3})\.([0-9]{1,3})/,
    /^127\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})/,
    /^169\.254\.([0-9]{1,3})\.([0-9]{1,3})/,
    /^fc00:/,
    /^fe80:/
  ];

  return ip => ip === '::1' ||
    ip === 'd0::11' ||
    ip === '0.0.0.0' ||
    ip.match(rs[0]) !== null ||
    ip.match(rs[1]) !== null ||
    ip.match(rs[2]) !== null ||
    ip.match(rs[3]) !== null ||
    ip.match(rs[4]) !== null ||
    ip.match(rs[5]) !== null ||
    ip.match(rs[6]) !== null;
})();

const prefs = {
  'dns': false,
  'open-in-background': false,
  'open-adjacent': true,
  'ip': 'http://www.tcpiputils.com/browse/ip-address/[ip]',
  'host': 'https://webbrowsertools.com/whois-lookup?query=[host]',
  'custom-cmd-1': '',
  'custom-cmd-2': '',
  'custom-cmd-3': '',
  'custom-cmd-4': '',
  'custom-cmd-5': '',
  'custom-cmd-1-title': '',
  'custom-cmd-2-title': '',
  'custom-cmd-3-title': '',
  'custom-cmd-4-title': '',
  'custom-cmd-5-title': '',
  'version': null,
  'faqs': true,
  'custom-command': '',
  'display-delay': 0.2
};
Object.assign(prefs, services.urls);
services.menuitems().forEach(p => {
  prefs[p] = services.default(p);
}, {});

const notify = message => chrome.notifications.create(null, {
  type: 'basic',
  iconUrl: '/data/icons/48.png',
  title: 'Country Flags & IP Whois',
  message
});

const dns = (host, callback) => chrome.runtime.sendNativeMessage('com.add0n.node', {
  permissions: ['dns'],
  script: `
    const dns = require('dns');

    dns.lookup('${host}', (err, address, family) => {
      push({err, address, family});
      done();
    });
  `
}, callback);
const exec = (cmd, callback) => chrome.runtime.sendNativeMessage('com.add0n.node', {
  permissions: ['child_process'],
  args: [cmd],
  script: `
    const {exec} = require('child_process');
    exec(args[0], (err, stdout, stderr) => {
      push({err, stdout, stderr});
      done();
    });
  `
}, callback);

function update(tabId/* , reason */) {
  const obj = tabs[tabId];
  if (obj) {
    const country = obj.country;
    let path;
    let title = 'Country Flags & IP Whois\n\n';

    if (obj.error || !country) {
      path = {
        16: '/data/icons/error/16.png',
        19: '/data/icons/error/19.png',
        32: '/data/icons/error/32.png',
        64: '/data/icons/error/64.png'
      };
      title += _('bgErr') + ': ' + obj.error || _('bgErr1');
    }
    else if (country === 'private') {
      path = {
        16: '/data/icons/private/16.png',
        19: '/data/icons/private/19.png',
        32: '/data/icons/private/32.png',
        64: '/data/icons/private/64.png'
      };
      title += _('bgMSG1');
      title += '\nHost: ' + obj.hostname;
    }
    else if (country === 'chrome') {
      path = {
        16: '/data/icons/chrome/16.png',
        19: '/data/icons/chrome/19.png',
        32: '/data/icons/chrome/32.png',
        64: '/data/icons/chrome/64.png'
      };
      title += _('bgMSG1');
      title += '\nHost: ' + obj.hostname;
    }
    else {
      path = {
        16: '/data/icons/flags/16/' + country + '.png',
        19: '/data/icons/flags/19/' + country + '.png',
        32: '/data/icons/flags/32/' + country + '.png',
        64: '/data/icons/flags/64/' + country + '.png'
      };
      title += _('bgCountry') + ': ' + _('country_' + country);
      title += '\n' + _('bgHost') + ': ' + obj.hostname;
    }
    title += '\n' + _('bgIP') + ': ' + obj.ip;
    const connecteds = Object.keys(obj.frames);
    if (connecteds.length) {
      title += `\n\n${_('bgFrames')}:\n`;
      connecteds.forEach((ip, i) => {
        title += obj.frames[ip].country + ' -> ' + obj.frames[ip].hostname + ` (${ip})` + (i !== connecteds.length - 1 ? '\n' : '');
      });
    }
    //
    window.setTimeout(() => {
      chrome.pageAction.setIcon({tabId, path}, () => chrome.runtime.lastError);
      chrome.runtime.lastError;
      if (prefs['custom-command']) {
        exec(prefs['custom-command'].replace('[ip]', obj.ip).replace('[host]', obj.hostname).replace('[url]', obj.url), o => {
          if (o.err) {
            title += '\n\n' + (o.err || o.stderr).trim();
          }
          else {
            title += '\n\n' + (o.stdout || o.stderr).trim();
          }
          chrome.pageAction.setTitle({title, tabId});
        });
      }
      else {
        chrome.pageAction.setTitle({title, tabId});
      }
      chrome.pageAction.show(tabId);
      chrome.runtime.lastError;
    }, prefs['display-delay'] * 1000);
  }
}

const worker = new Worker('/worker.js');
worker.onmessage = ({data}) => {
  const {tabId, error, ip} = data;
  const country = (data.country ? data.country.iso_code : (data.continent ? data.continent.code : ''));

  const top = tabs[tabId].ip === ip;
  const frames = tabs[tabId].frames;
  if (error && top) {
    tabs[tabId].error = error;
  }
  else if (error && frames && frames[ip]) {
    frames[ip].error = error;
  }
  if (country) {
    if (top) {
      tabs[tabId].country = country;
    }
    if (frames && frames[ip]) {
      frames[ip].country = country;
    }
  }

  update(tabId, 'IP resolved');
};

function resolve(tabId, ip = tabs[tabId].ip) {
  worker.postMessage({tabId, ip});
}

const onResponseStarted = d => {
  const {ip, tabId, url, type, timeStamp} = d;
  if (!ip) {
    return;
  }

  const set = (obj, doUpdate = false, doResolve) => {
    if (type === 'sub_frame') {
      if (tabs[tabId] === undefined || tabs[tabId].frames[ip]) {
        return;
      }
      tabs[tabId].frames[obj.ip || ip] = {
        hostname
      };
      if (obj.country) {
        tabs[tabId].frames[obj.ip || ip].country = obj.country;
      }
    }
    else {
      Object.assign(tabs[tabId], obj);
    }
    if (doUpdate) {
      update(tabId, 'private address');
    }
    if (doResolve) {
      resolve(tabId, obj.ip || ip);
    }
  };

  if (tabs[tabId]) {
    if (url && url.indexOf(tabs[tabId].hostname) !== -1 && tabs[tabId].country && ip === tabs[tabId].ip) {
      tabs[tabId].frames = {};
      tabs[tabId].timeStamp = timeStamp;

      return set(tabs[tabId], true, false);
    }
  }

  const hostname = (new URL(url)).hostname;

  if (type === 'main_frame') {
    tabs[tabId] = {
      hostname,
      url,
      ip,
      frames: {},
      timeStamp
    };
  }

  if (isPrivate(ip)) {
    if (prefs.dns) {
      return dns(hostname, resp => {
        if (resp && !resp.err && resp.address) {
          if (isPrivate(resp.address)) {
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
  types: (localStorage.getItem('type') || 'main_frame').split(', ')
}, []);

// For worker-based websites; https://twitter.com/
chrome.webNavigation.onCommitted.addListener(d => {
  const {url, tabId, frameId} = d;

  if (frameId !== 0) {
    return;
  }
  if (url.startsWith('http') === false) {
    return;
  }
  // already resolved with webRequest
  if (tabs[tabId]) {
    if (d.timeStamp - tabs[tabId].timeStamp < 500) {
      return;
    }
  }
  // console.log('missed');
  xDNS(url).then(d => onResponseStarted({
    ip: d.ip,
    tabId,
    url: d.url,
    type: 'main_frame',
    timeStamp: Date.now()
  })).catch(e => console.warn('Cannot resolve using xDNS', url, e));
});

function open(url, tab) {
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
  const ip = tabs[tab.id].ip;
  const hostname = (new URL(tab.url)).hostname;

  if (hostname) {
    open(prefs.host.replace('[ip]', ip).replace('[host]', hostname), tab);
  }
  else if (tabs[tab.id] && ip) {
    open(prefs.ip.replace('[ip]', ip).replace('[host]', hostname), tab);
  }
  else {
    open(prefs.host.replace('[ip]', ip).replace('[host]', hostname), tab);
  }
});

// context menu
function contexts() {
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
}
chrome.runtime.onMessage.addListener(request => {
  if (request.method === 'contexts') {
    contexts();
  }
});

const copy = str => {
  const next = () => navigator.clipboard.writeText(str).catch(() => new Promise(resolve => {
    document.oncopy = e => {
      e.clipboardData.setData('text/plain', str);
      e.preventDefault();
      resolve();
    };
    document.execCommand('Copy', false, null);
  })).then(() => notify(_('bgMSG2')));

  if (/Firefox/.test(navigator.userAgent)) {
    chrome.permissions.request({
      permissions: ['clipboardWrite']
    }, granted => granted && next());
  }
  else {
    next();
  }
};

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'copy-ip') {
    if (tabs[tab.id] && tabs[tab.id].ip) {
      const str = tabs[tab.id].ip;
      copy(str);
    }
    else {
      notify(_('bgErr4'));
    }
    return;
  }

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
  open(url, tab);
});

// prefs
chrome.storage.onChanged.addListener(ps => {
  Object.keys(ps).forEach(k => prefs[k] = ps[k].newValue);
});
chrome.storage.local.get(prefs, ps => {
  // prefs
  Object.assign(prefs, ps);
  // context
  contexts();
});

/* FAQs & Feedback */
{
  const {management, runtime: {onInstalled, setUninstallURL, getManifest}, storage, tabs} = chrome;
  if (navigator.webdriver !== true) {
    const page = getManifest().homepage_url;
    const {name, version} = getManifest();
    onInstalled.addListener(({reason, previousVersion}) => {
      management.getSelf(({installType}) => installType === 'normal' && storage.local.get({
        'faqs': true,
        'last-update': 0
      }, prefs => {
        if (reason === 'install' || (prefs.faqs && reason === 'update')) {
          const doUpdate = (Date.now() - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
          if (doUpdate && previousVersion !== version) {
            tabs.create({
              url: page + '?version=' + version + (previousVersion ? '&p=' + previousVersion : '') + '&type=' + reason,
              active: reason === 'install'
            });
            storage.local.set({'last-update': Date.now()});
          }
        }
      }));
    });
    setUninstallURL(page + '?rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
  }
}
