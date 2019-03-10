/* globals onResponseStarted */
'use strict';

document.addEventListener('DOMContentLoaded', () => chrome.tabs.query({
  url: '*://*/*'
}, tabs => {
  if (tabs.length) {
    const cache = tabs.reduce((p, c) => {
      if (p[c.url]) {
        p[c.url].push(c.id);
      }
      else {
        p[c.url] = [c.id];
      }
      return p;
    }, {});

    const init = d => cache[d.url] && cache[d.url].forEach(tabId => onResponseStarted({
      ip: d.ip,
      tabId,
      url: d.url
    }));

    chrome.webRequest.onResponseStarted.addListener(init, {
      urls: ['*://*/*'],
      types: ['xmlhttprequest']
    }, []);

    Promise.all(
      tabs.map(t => fetch(t.url).then(r => r.headers.get('content-type')).catch(() => {}))
    ).then(() => {
      window.setTimeout(() => chrome.webRequest.onResponseStarted.removeListener(init), 5000);
    });
  }
}));
