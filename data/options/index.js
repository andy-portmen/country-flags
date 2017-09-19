'use strict';

document.getElementById('dns').addEventListener('change', ({target}) => {
  if (target.checked) {
    chrome.runtime.sendNativeMessage('com.add0n.node', {
      cmd: 'version'
    }, response => {
      if (response) {
        return chrome.storage.local.set({
          dns: true
        });
      }
      target.checked = false;
      chrome.tabs.create({
        url: '/data/helper/index.html'
      });
    });
  }
  else {
    chrome.storage.local.set({
      dns: false
    });
  }
});

chrome.storage.local.get({
  dns: false
}, prefs => document.getElementById('dns').checked = prefs.dns);
