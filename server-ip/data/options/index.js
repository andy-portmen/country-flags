'use strict';

const toast = document.getElementById('toast');

chrome.storage.local.get({
  'info': 'https://isc.sans.edu/ipinfo.html?ip=[ip]'
}, prefs => document.getElementById('info').value = prefs.info);

document.getElementById('save').addEventListener('click', () => chrome.storage.local.set({
  'info': document.getElementById('info').value || 'https://isc.sans.edu/ipinfo.html?ip=[ip]'
}, () => {
  toast.textContent = 'Options Saved!';
  window.setTimeout(() => toast.textContent = '', 750);
}));

// reset
document.getElementById('reset').addEventListener('click', e => {
  if (e.detail === 1) {
    toast.textContent = 'Double-click to reset!';
    window.setTimeout(() => toast.textContent = '', 750);
  }
  else {
    localStorage.clear();
    chrome.storage.local.clear(() => {
      chrome.runtime.reload();
      window.close();
    });
  }
});
// support
document.getElementById('support').addEventListener('click', () => chrome.tabs.create({
  url: chrome.runtime.getManifest().homepage_url + '&rd=donate'
}));
