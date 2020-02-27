/* globals onResponseStarted, xDNS */
'use strict';

document.addEventListener('DOMContentLoaded', () => chrome.tabs.query({
  url: '*://*/*'
}, tabs => {
  if (tabs) {
    for (const tab of tabs) {
      if (tab.url.startsWith('http')) {
        xDNS(tab.url).then(d => onResponseStarted({
          ip: d.ip,
          tabId: tab.id,
          url: d.url,
          type: 'main_frame'
        })).catch(e => console.warn('Cannot resolve using xDNS', tab.url, e));
      }
    }
  }
}));
