/* globals onResponseStarted */
'use strict';

document.addEventListener('DOMContentLoaded', () => chrome.tabs.query({
  url: '*://*/*'
}, tabs => {
  if (tabs.length) {
    const cache = tabs.reduce((p, c) => {
      p[c.url] = c.id;
      return p;
    }, {});

    const init = d => cache[d.url] && onResponseStarted({
      ip: d.ip,
      tabId: cache[d.url],
      url: d.url
    });

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
