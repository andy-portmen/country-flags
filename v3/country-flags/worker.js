/* global importScripts, utils  */
importScripts('worker/utils.js');
importScripts('worker/require.js', 'worker/vendor/jgeoip.js', 'worker/worker.js');
importScripts('existing.js');
importScripts('services.js', 'context.js');
importScripts('cache.js');

chrome.action.setBadgeBackgroundColor({
  color: '#666'
});

chrome.tabs.onRemoved.addListener(tabId => chrome.storage.session.remove('tab-' + tabId));

const exec = (cmd, callback) => chrome.runtime.sendNativeMessage ? chrome.runtime.sendNativeMessage('com.add0n.node', {
  permissions: ['child_process'],
  args: [cmd],
  script: `
    const {exec} = require('child_process');
    exec(args[0], (err, stdout, stderr) => {
      push({err, stdout, stderr});
      done();
    });
  `
}, callback) : callback({
  stderr: '"Native Messaging" is not accessible. Make sure the permission is enabled from the options page and use it after a restart.'
});

const dns = (host, callback) => chrome.runtime.sendNativeMessage ? chrome.runtime.sendNativeMessage('com.add0n.node', {
  permissions: ['dns'],
  script: `
    const dns = require('dns');

    dns.lookup('${host}', (err, address, family) => {
      push({err, address, family});
      done();
    });
  `
}, callback) : callback({
  err: '"Native Messaging" is not accessible. Make sure the permission is enabled from the options page and use it after a restart.'
});

const pp = {
  get: tabId => new Promise(resolve => chrome.storage.session.get('tab-' + tabId, p => {
    resolve(p['tab-' + tabId]);
  })),
  set: (tabId, o) => new Promise(resolve => chrome.storage.session.set({
    ['tab-' + tabId]: o
  }, resolve))
};

const update = (tabId, reason, tab) => {
  // console.log('update', tabId, reason, tab?.ip);
  if (tab) {
    const country = tab.country;
    let path;
    let title = 'Country Flags & IP Whois\n\n';

    if (tab.error || !country) {
      path = {
        16: '/data/icons/error/16.png',
        32: '/data/icons/error/32.png',
        48: '/data/icons/error/48.png'
      };
      title += utils.translate('bgErr') + ': ' + tab.error || utils.translate('bgErr1');
    }
    else if (country === 'private') {
      path = {
        16: '/data/icons/private/16.png',
        32: '/data/icons/private/32.png',
        48: '/data/icons/private/48.png'
      };
      title += utils.translate('bgMSG1');
      title += '\nHost: ' + tab.hostname;
    }
    else if (country === 'chrome') {
      path = {
        16: '/data/icons/chrome/16.png',
        32: '/data/icons/chrome/32.png',
        48: '/data/icons/chrome/48.png'
      };
      title += utils.translate('bgMSG1');
      title += '\nHost: ' + tab.hostname;
    }
    else {
      path = {
        16: '/data/icons/flags/16/' + country + '.png',
        32: '/data/icons/flags/32/' + country + '.png',
        48: '/data/icons/flags/48/' + country + '.png'
      };
      title += utils.translate('bgCountry') + ': ' + utils.translate('country_' + country);
      title += '\n' + utils.translate('bgHost') + ': ' + tab.hostname;
    }
    title += '\n' + utils.translate('bgIP') + ': ' + tab.ip;

    title += '\n\n' + utils.translate('bgResolveMethod') + ': ' + reason;

    const connecteds = Object.keys(tab.frames || {});
    if (connecteds.length) {
      title += `\n\n${utils.translate('bgFrames')}:\n`;
      connecteds.forEach((ip, i) => {
        title += tab.frames[ip].country + ' -> ' + tab.frames[ip].hostname + ` (${ip})` + (i !== connecteds.length - 1 ? '\n' : '');
      });
    }
    //
    chrome.storage.local.get({
      'display-delay': 0.2,
      'custom-command': '',
      'show-from-cache': false
    }, prefs => setTimeout(() => {
      chrome.action.setIcon({tabId, path}, () => chrome.runtime.lastError);
      if (
        prefs['show-from-cache'] &&
        reason && reason.startsWith('xDNS') && reason.endsWith('resolved')
      ) {
        chrome.action.setBadgeText({tabId, text: 'c'});
        title += '\n' + utils.translate('bgFromCache');
      }

      chrome.runtime.lastError;
      if (prefs['custom-command']) {
        exec(prefs['custom-command'].replace('[ip]', tab.ip).replace('[host]', tab.hostname).replace('[url]', tab.url), o => {
          if (o) {
            if (o.stdout || o.stderr) {
              title += '\n\n' + (o.stdout || o.stderr).trim();
            }
            else if (o.err) {
              title += '\n\n' + JSON.stringify(o.err, undefined, '  ').trim();
            }
            chrome.action.setTitle({title, tabId});
          }
        });
      }
      else {
        chrome.action.setTitle({title, tabId});
      }
      chrome.runtime.lastError;
    }, prefs['display-delay'] * 1000));
  }
};

const resolve = (tabId, ip, tab, reason) => {
  ip = ip || tab.ip;

  self.perform({tabId, ip}, async data => {
    const {error, ip} = data;
    const dc = data.country || data.registered_country;
    const country = (dc ? dc.iso_code : (data.continent ? data.continent.code : ''));

    const top = tab.ip === ip;
    const frames = tab.frames;
    if (error && top) {
      tab.error = error;
      await pp.set(tabId, tab);
    }
    else if (error && frames && frames[ip]) {
      frames[ip].error = error;
      await pp.set(tabId, tab);
    }
    if (country) {
      if (top) {
        tab.country = country;
        await pp.set(tabId, tab);
      }
      if (frames && frames[ip]) {
        frames[ip].country = country;
        await pp.set(tabId, tab);
      }
    }

    update(tabId, reason || 'IP', tab);
  });
};

const onResponseStarted = async d => {
  const {ip, tabId, url, type, timeStamp} = d;
  if (!ip) {
    return;
  }

  let tab = await pp.get(tabId);

  const set = async (obj, doUpdate = false, doResolve) => {
    if (type === 'sub_frame') {
      if (tab === undefined || tab.frames[ip]) {
        return;
      }
      tab.frames[obj.ip || ip] = {
        hostname
      };
      if (obj.country) {
        tab.frames[obj.ip || ip].country = obj.country;
      }
    }
    else {
      Object.assign(tab, obj);
    }
    await pp.set(tabId, tab);
    if (doUpdate) {
      // already know the IP address
      update(tabId, 'database', tab);
    }
    if (doResolve) {
      resolve(tabId, obj.ip || ip, tab, d.reason);
    }
  };

  if (tab) {
    if (url && url.includes(tab.hostname) && tab.country && ip === tab.ip) {
      tab.frames = {};
      tab.timeStamp = timeStamp;

      return set(tab, true, false);
    }
  }

  const hostname = (new URL(url)).hostname;

  if (type === 'main_frame') {
    tab = {
      hostname,
      url,
      ip,
      frames: {},
      timeStamp
    };
    await pp.set(tabId, tab);
  }

  if (utils.isPrivate(ip)) {
    chrome.storage.local.get({
      'dns': false
    }, prefs => {
      if (prefs.dns) {
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
    });
  }
  else {
    set({ip}, false, true);
  }
};

const observe = () => chrome.storage.local.get({
  'observer-types': ['main_frame']
}, prefs => chrome.webRequest.onResponseStarted.addListener(onResponseStarted, {
  urls: ['*://*/*'],
  types: prefs['observer-types']
}));
observe();
chrome.storage.onChanged.addListener(ps => {
  if (ps['observer-types']) {
    observe();
  }
});

// use in case ip is not resolved by top_frame request
const xDNS = href => new Promise((resolve, reject) => {
  const {origin} = new URL(href);

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
    // https://github.com/andy-portmen/country-flags/issues/79#issuecomment-1186255111
    credentials: 'omit',
    redirect: 'manual',
    signal
  }).then(r => r.text()).catch(e => done(null, e));
});
// For worker-based websites; https://twitter.com/
chrome.webNavigation.onCommitted.addListener(async d => {
  const {url, tabId, frameId} = d;

  if (frameId !== 0) {
    return;
  }
  if (url.startsWith('http') === false) {
    return;
  }

  const tab = await pp.get(tabId);

  // already resolved with webRequest
  if (tab) {
    if (d.timeStamp - tab.timeStamp < 500) {
      return;
    }
  }

  // console.log('missed');
  xDNS(url).then(d => onResponseStarted({
    reason: 'xDNS:navigation:resolved',
    ip: d.ip,
    tabId,
    url: d.url,
    type: 'main_frame',
    timeStamp: Date.now()
  })).catch(async e => {
    const tab = {
      error: e.message
    };

    await pp.set(tabId, tab);
    update(tabId, 'xDNS:navigation:rejected', tab);
    console.warn('Cannot resolve using xDNS', url, e);
  });
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
            tabs.query({active: true, currentWindow: true}, tbs => tabs.create({
              url: page + '?version=' + version + (previousVersion ? '&p=' + previousVersion : '') + '&type=' + reason,
              active: reason === 'install',
              ...(tbs && tbs.length && {index: tbs[0].index + 1})
            }));
            storage.local.set({'last-update': Date.now()});
          }
        }
      }));
    });
    setUninstallURL(page + '?rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
  }
}
