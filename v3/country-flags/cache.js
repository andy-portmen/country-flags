'use strict';

// clear database cache once per 7 days

chrome.alarms.onAlarm.addListener(async a => {
  if (a.name === 'clear-cache') {
    const cache = await caches.open('cache');
    for (const key of await cache.keys()) {
      cache.delete(key);
    }
  }
});

chrome.runtime.onInstalled.addListener(async () => {
  const {periodInMinutes} = await chrome.storage.local.get({
    periodInMinutes: 7 * 24 * 60
  });
  chrome.alarms.create('clear-cache', {
    periodInMinutes
  });
});
