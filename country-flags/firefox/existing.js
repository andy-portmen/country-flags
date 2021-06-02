/* globals onResponseStarted, xDNS, update, tabs */
'use strict';

document.addEventListener('DOMContentLoaded', () => chrome.tabs.query({
  url: '*://*/*'
}, tbs => {
  if (tbs) {
    for (const tab of tbs) {
      if (tab.url.startsWith('http')) {
        xDNS(tab.url).then(d => onResponseStarted({
          ip: d.ip,
          tabId: tab.id,
          url: d.url,
          type: 'main_frame',
          timeStamp: Date.now()
        })).catch(e => {
          tabs[tab.id] = {
            error: e.message
          };
          update(tab.id, 'xDNS failed');
          console.warn('Cannot resolve using xDNS', tab.url, e);
        });
      }
    }
  }
}));
