'use strict';

const toast = document.getElementById('toast');

chrome.storage.local.get({
  'info': 'https://isc.sans.edu/ipinfo.html?ip=[ip]',
  'char': 7,
  'uppercase': true,
  'ip-css': ''
}, prefs => {
  document.getElementById('info').value = prefs.info;
  document.getElementById('char').value = prefs.char;
  document.getElementById('uppercase').checked = prefs.uppercase;
  document.getElementById('ip-css').value = prefs['ip-css'];
});

document.getElementById('save').addEventListener('click', () => chrome.storage.local.set({
  'info': document.getElementById('info').value || 'https://isc.sans.edu/ipinfo.html?ip=[ip]',
  'char': Math.max(3, Math.min(20, Number(document.getElementById('char').value))),
  'uppercase': document.getElementById('uppercase').checked,
  'ip-css': document.getElementById('ip-css').value
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
