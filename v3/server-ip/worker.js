'use strict';

if (typeof importScripts !== 'undefined') {
  self.importScripts('worker/require.js', 'worker/vendor/jgeoip.js', 'worker/worker.js');
  self.importScripts('cache.js');
}

{
  const offscreenCanvas = new OffscreenCanvas(10, 10); // Width and height can be arbitrary
  const context = offscreenCanvas.getContext('2d');
  context.font = '13px arial, sans-serif'; // must be equal to the iframe used for displaying ip address
  self.fsize = text => {
    return context.measureText(text).width;
  };
}

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
    'padding': 73, // 5 + 16 + 5 + [ip] + 5 + 16 + 5 + 16 + 5
    'uppercase': true,
    'bottom': 20,
    'left': 30
  }, prefs => {
    if (prefs['uppercase']) {
      ip = ip.toUpperCase();
    }
    const args = new URLSearchParams();
    args.set('ip', ip);
    args.set('flag', flag);
    args.set('url', url);
    args.set('error', error);
    const dest = chrome.runtime.getURL('/data/ip/ip.html?' + args.toString());

    chrome.scripting.executeScript({
      injectImmediately: true,
      target: {
        tabId
      },
      func: (x, y, width, dest, isFF) => {
        if (document.querySelector('.server-ip')) {
          return;
        }
        const span = document.createElement('span');
        span.classList.add('server-ip');
        span.title = 'Drag the flag and move to change the position';
        const iframe = document.createElement('iframe');
        iframe.setAttribute('src', dest);
        iframe.classList.add('server-ip');
        iframe.style.bottom = y + 'px';
        iframe.style.left = x + 'px';
        iframe.style.width = width + 'px';
        if (isFF) {
          span.style.left = iframe.style.left;
          span.style.bottom = iframe.style.bottom;
        }

        const move = e => {
          x = Math.max(0, x + e.movementX);
          y = Math.max(0, y - e.movementY);
          iframe.style.left = x + 'px';
          iframe.style.bottom = y + 'px';
          if (isFF) {
            span.style.left = iframe.style.left;
            span.style.bottom = iframe.style.bottom;
          }
          chrome.storage.local.set({
            left: x,
            bottom: y
          });
        };
        const expire = () => {
          document.removeEventListener('mousemove', move);
          span.classList.remove('expanded');
        };
        span.addEventListener('mouseleave', expire);
        document.addEventListener('mouseup', expire);
        span.addEventListener('mousedown', () => {
          span.classList.add('expanded');
          document.removeEventListener('mousemove', move);
          document.addEventListener('mousemove', move);
        });
        if (document.body) {
          document.body.append(iframe, span);
        }
        else {
          document.addEventListener('DOMContentLoaded', () => {
            document.body.append(iframe, span);
          });
        }
      },
      args: [prefs.left, prefs.bottom, prefs.padding + self.fsize(ip), dest, navigator.userAgent.includes('Firefox')]
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
          document.querySelectorAll('.server-ip').forEach(e => e.remove());
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
    const {homepage_url: page, name, version} = getManifest();
    onInstalled.addListener(({reason, previousVersion}) => {
      management.getSelf(({installType}) => installType === 'normal' && storage.local.get({
        'faqs': true,
        'last-update': 0
      }, prefs => {
        if (reason === 'install' || (prefs.faqs && reason === 'update')) {
          const doUpdate = (Date.now() - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
          if (doUpdate && previousVersion !== version) {
            tabs.query({active: true, lastFocusedWindow: true}, tbs => tabs.create({
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
