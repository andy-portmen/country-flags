/* global utils, pp, services */
'use strict';

// context menu
const contexts = () => chrome.storage.local.get({
  ...services.urls,
  ...services.menuitems().reduce((p, c) => {
    p[c] = services.default(c);
    return p;
  }, {}),
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
  'other-services': true
}, async prefs => {
  const dictionary = async id => {
    if (id.startsWith('custom-cmd-')) {
      const n = id.slice(-1);
      return prefs[`custom-cmd-${n}-title`] || await utils.translate('bgCustom' + n);
    }
    else {
      return await utils.translate(services.dictionary[id]);
    }
  };

  const names = services.names
    .filter(id => id !== 'ip' && id !== 'host')
    // do not display custom commands when the URL is not set
    .filter(id => id.startsWith('custom-cmd-') ? prefs[id] : true);

  const items = names.filter(key => prefs[key + '-menuitem']).slice(0, 5);
  for (const id of items) {
    chrome.contextMenus.create({
      contexts: ['action'],
      id,
      title: await dictionary(id)
    });
  }

  // other services
  if (prefs['other-services']) {
    chrome.contextMenus.create({
      id: 'other-services',
      contexts: ['action'],
      title: await utils.translate('bgOtherServices')
    });
    // change order (everything checked above 5 is located on top of the others menu)
    for (const id of [
      ...names.filter(id => items.indexOf(id) === -1).filter(key => prefs[key + '-menuitem'] === true),
      ...names.filter(id => items.indexOf(id) === -1).filter(key => prefs[key + '-menuitem'] === false)
    ]) {
      chrome.contextMenus.create({
        contexts: ['action'],
        id,
        title: await dictionary(id),
        parentId: 'other-services'
      });
    }
  }
});
chrome.runtime.onInstalled.addListener(contexts);
chrome.runtime.onStartup.addListener(contexts);

chrome.runtime.onMessage.addListener(request => {
  if (request.method === 'contexts') {
    contexts();
  }
});

const replace = (url, tab, obj) => {
  if (url.startsWith('post:')) {
    const [data, s] = url.replace('post:', '').split('@');
    url = 'data/post/index.html?href=' + encodeURIComponent(s) + '&data=' + encodeURIComponent(data);
  }

  url = url
    .replace('[lang]', chrome.i18n.getUILanguage())
    .replace('%5Blang%5D', chrome.i18n.getUILanguage())
    .replace('[url]', tab.url)
    .replace('%5Burl%5D', tab.url)
    .replace('[enurl]', encodeURIComponent(tab.url))
    .replace('%5Benurl%5D', encodeURIComponent(tab.url));

  if (url.indexOf('[host]') !== -1 || url.indexOf('%5Bhost%5D') !== -1) {
    const hostname = (new URL(tab.url)).hostname;
    url = url.replace('[host]', hostname);
    url = url.replace('%5Bhost%5D', hostname);
  }
  if (url.indexOf('[curl]') !== -1 || url.indexOf('%5Bcurl%5D') !== -1) {
    const curl = tab.url.split('?')[0].split('#')[0];
    url = url.replace('[curl]', curl);
    url = url.replace('%5Bcurl%5D', curl);
  }
  if (url.indexOf('[ip]') !== -1 || url.indexOf('%5Bip%5D') !== -1) {
    if (obj && obj.ip) {
      url = url.replace('[ip]', obj.ip);
      url = url.replace('%5Bip%5D', obj.ip);
    }
    else {
      throw Error('cannot find IP address');
    }
  }

  return url;
};

const copy = async str => {
  try {
    await navigator.clipboard.writeText(str);
  }
  catch (e) {
    const win = await chrome.windows.getCurrent();
    chrome.storage.local.get({
      width: 400,
      height: 300,
      left: win.left + Math.round((win.width - 400) / 2),
      top: win.top + Math.round((win.height - 300) / 2)
    }, prefs => {
      chrome.windows.create({
        url: '/data/copy/index.html?content=' + encodeURIComponent(str),
        width: prefs.width,
        height: prefs.height,
        left: prefs.left,
        top: prefs.top,
        type: 'popup'
      });
    });
  }
};

const open = (url, tab) => chrome.storage.local.get({
  'open-in-background': false,
  'open-adjacent': true
}, prefs => {
  const prop = {
    url,
    active: !prefs['open-in-background']
  };
  if (prefs['open-adjacent']) {
    prop.index = tab.index + 1;
  }
  chrome.tabs.create(prop);
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const obj = await pp.get(tab.id);

  if (info.menuItemId === 'copy-ip') {
    if (obj && obj.ip) {
      const str = obj.ip;
      copy(str);
    }
    else {
      utils.notify(await utils.translate('bgErr4'));
    }
    return;
  }

  chrome.storage.local.get({
    [info.menuItemId]: services.urls[info.menuItemId]
  }, prefs => {
    try {
      const url = replace(prefs[info.menuItemId], tab, obj);
      open(url, tab);
    }
    catch (e) {
      console.warn(e);
      utils.translate('bgErr4').then(utils.notify);
    }
  });
});

/* left click */
chrome.action.onClicked.addListener(tab => chrome.storage.local.get({
  'page-action-type': 'ip-host',
  'ip': 'http://www.tcpiputils.com/browse/ip-address/[ip]',
  'host': 'https://webbrowsertools.com/whois-lookup?query=[host]'
}, async prefs => {
  try {
    if (prefs['page-action-type'] === 'ip-host') {
      const obj = await pp.get(tab.id);

      const ip = obj.ip;
      const hostname = (new URL(tab.url)).hostname;

      if (hostname) {
        const url = replace(prefs.host, tab, obj);
        open(url, tab);
      }
      else if (obj && ip) {
        const url = replace(prefs.ip, tab, obj);
        open(url, tab);
      }
      else {
        const url = replace(prefs.host, tab, obj);
        open(url, tab);
      }
    }
    else if (prefs['page-action-type'] === 'options-page') {
      chrome.runtime.openOptionsPage();
    }
    else {
      chrome.action.getTitle({
        tabId: tab.id
      }, async s => {
        s = `Link: ${tab.url}
  Title: ${tab.title}


  ` + (s || 'empty').replace(chrome.runtime.getManifest().name, '').trim();


        if (prefs['page-action-type'] === 'copy-tooltip') {
          copy(s);
        }
        else {
          const win = await chrome.windows.getCurrent();

          chrome.storage.local.get({
            'window.width': 300,
            'window.height': 400,
            'window.left': win.left + Math.round((win.width - 300) / 2),
            'window.top': win.top + Math.round((win.height - 400) / 2)
          }, prefs => {
            chrome.windows.create({
              url: 'data/alert/index.html?msg=' + encodeURIComponent(s),
              width: prefs['window.width'],
              height: prefs['window.height'],
              left: prefs['window.left'],
              top: prefs['window.top'],
              type: 'popup'
            });
          });
        }
      });
    }
  }
  catch (e) {
    utils.notify(e);
  }
}));
