/* globals onResponseStarted, xDNS, update, pp */
'use strict';

{
  const once = () => chrome.tabs.query({
    url: '*://*/*'
  }, tbs => {
    for (const tab of tbs) {
      if (tab.url && tab.url.startsWith('http')) {
        xDNS(tab.url).then(d => onResponseStarted({
          ip: d.ip,
          tabId: tab.id,
          url: d.url,
          type: 'main_frame',
          timeStamp: Date.now()
        })).catch(async e => {
          await pp.set(tab.id, {
            error: e.message
          });
          update(tab.id, 'xDNS', tab);
          console.warn('Cannot resolve using xDNS', tab.url, e.message);
        });
      }
    }
  });

  chrome.runtime.onInstalled.addListener(once);
  chrome.runtime.onStartup.addListener(once);
}

