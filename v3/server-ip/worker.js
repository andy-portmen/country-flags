'use strict';

self.importScripts('worker/require.js', 'worker/vendor/jgeoip.js', 'worker/worker.js');

const style = 'background-color: #fff; position: fixed; bottom: [bottom]px; left: [left]px; z-index: 100000000000; border: none;' +
  'width: [width]px; min-width: [width]px; max-width: [width]px; height: 24px; min-height: 24px; max-height: 24px;';

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
    signal
  }).then(r => r.text()).catch(e => done(null, e));
});

const cache = {};
chrome.tabs.onRemoved.addListener(tabId => delete cache[tabId]);

const resolve = (data, url, tabId) => {
  const {error} = data;
  let {ip} = data;
  const dc = data.country || data.registered_country;
  const flag = (dc ? dc.iso_code : (data.continent ? data.continent.code : ''));
  chrome.storage.local.get({
    'char': 7,
    'padding': 48,
    'uppercase': true,
    'bottom': 20,
    'left': 30
  }, prefs => {
    if (prefs['uppercase']) {
      ip = ip.toUpperCase();
    }
    const dest = chrome.runtime.getURL(
      '/data/ip/ip.html?ip=' + ip + '&flag=' + flag + '&url=' + encodeURIComponent(url) + '&error=' + error
    );

    const css = style
      .replace(/\[left\]/g, prefs.left)
      .replace(/\[bottom\]/g, prefs.bottom)
      .replace(/\[width\]/g, prefs.padding + ip.length * prefs.char);

    chrome.scripting.executeScript({
      target: {
        tabId
      },
      func: (x, y, dest, css) => {
        if (window.iframe === undefined) {
          window.iframe = document.createElement('iframe');
          window.iframe.setAttribute('src', dest);
          window.iframe.setAttribute('style', css);
          window.addEventListener('message', e => {
            if (e.data && e.data.method === 'move-flag') {
              x = Math.max(0, x + e.data.dx);
              y = Math.max(0, y - e.data.dy);
              window.iframe.style.left = x + 'px';
              window.iframe.style.bottom = y + 'px';

              chrome.storage.local.set({
                left: x,
                bottom: y
              });
            }
          });
          if (document.body) {
            document.body.appendChild(window.iframe);
          }
          else {
            document.addEventListener('DOMContentLoaded', () => {
              document.body.appendChild(window.iframe);
            });
          }
        }
      },
      args: [prefs.left, prefs.bottom, dest, css]
    }, () => chrome.runtime.lastError);
  });
};

chrome.webRequest.onResponseStarted.addListener(({tabId, ip, url}) => {
  cache[tabId] = url;
  if (ip) {
    setTimeout(() => self.perform({
      ip
    }, data => resolve(data, url, tabId)), 500);
  }
}, {
  urls: ['*://*/*'],
  types: ['main_frame']
}, [
  'responseHeaders' // to prevent "No tab with id" error
]);

chrome.runtime.onMessage.addListener((request, sender) => {
  const tabId = sender.tab.id;
  if (request.cmd === 'close-me') {
    chrome.scripting.executeScript({
      target: {
        tabId
      },
      func: () => {
        try {
          window.iframe.remove();
        }
        catch (e) {}
      }
    });
  }
  else if (request.cmd === 'verify') {
    const tabId = sender.tab.id;
    if (cache[tabId] !== sender.tab.url) {
      xDNS(sender.tab.url).then(d => self.perform({
        ip: d.ip
      }, data => resolve(data, sender.tab.url, sender.tab.id))).catch(e => console.warn('xDNS failed to get IP address', e));
    }
  }
  else if (request.cmd === 'open') {
    chrome.tabs.create({
      url: request.url,
      index: sender.tab.index + 1
    });
  }
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
              url: page + '&version=' + version + (previousVersion ? '&p=' + previousVersion : '') + '&type=' + reason,
              active: reason === 'install',
              ...(tbs && tbs.length && {index: tbs[0].index + 1})
            }));
            storage.local.set({'last-update': Date.now()});
          }
        }
      }));
    });
    setUninstallURL(page + '&rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
  }
}
