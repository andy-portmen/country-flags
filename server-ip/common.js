/* global browser */
'use strict';

const style = 'background-color: #fff; position: fixed; bottom: 20px; left: 30px; z-index: 100000000000; border: none;' +
  'width: [width]px; min-width: [width]px; max-width: [width]px; height: 24px; min-height: 24px; max-height: 24px;';

const worker = new Worker('/worker.js');
worker.onmessage = ({data}) => {
  const {tabId, error, url} = data;
  let {ip} = data;
  const flag = (data.country ? data.country.iso_code : (data.continent ? data.continent.code : ''));
  chrome.storage.local.get({
    'char': 7,
    'padding': 48,
    'uppercase': true
  }, prefs => {
    if (prefs['uppercase']) {
      ip = ip.toUpperCase();
    }
    const dest = chrome.runtime.getURL(
      '/data/ip/ip.html?ip=' + ip + '&flag=' + flag + '&url=' + encodeURIComponent(url) + '&error=' + error
    );
    chrome.tabs.executeScript(tabId, {
      runAt: 'document_start',
      code: `
        if (window.iframe === undefined) {
          window.iframe = document.createElement('iframe');
          window.iframe.setAttribute('src', "${dest}");
          window.iframe.setAttribute('style', '${style.replace(/\[width\]/g, prefs.padding + ip.length * prefs.char)}');
          if (document.body) {
            document.body.appendChild(window.iframe);
          }
          else {
            document.addEventListener('DOMContentLoaded', () => {
              document.body.appendChild(window.iframe);
            });
          }
        }
      `
    }, () => chrome.runtime.lastError);
  });
};

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

const cache = {};
chrome.tabs.onRemoved.addListener(tabId => delete cache[tabId]);

chrome.webRequest.onResponseStarted.addListener(({tabId, ip, url}) => {
  cache[tabId] = url;
  if (ip) {
    window.setTimeout(() => worker.postMessage({
      ip,
      url,
      tabId
    }), 500);
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
    chrome.tabs.executeScript(tabId, {
      runAt: 'document_start',
      code: `
        if (window.iframe !== undefined) {
          window.iframe.remove();
        }
      `
    });
  }
  else if (request.cmd === 'verify') {
    const tabId = sender.tab.id;
    if (cache[tabId] !== sender.tab.url) {
      xDNS(sender.tab.url).then(d => worker.postMessage({
        ip: d.ip,
        url: sender.tab.url,
        tabId: sender.tab.id
      })).catch(e => console.warn('xDNS failed to get IP address', e));
    }
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
            tabs.create({
              url: page + '&version=' + version + (previousVersion ? '&p=' + previousVersion : '') + '&type=' + reason,
              active: reason === 'install'
            });
            storage.local.set({'last-update': Date.now()});
          }
        }
      }));
    });
    setUninstallURL(page + '&rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
  }
}
