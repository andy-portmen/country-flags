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

// preferences
function save() {
  chrome.storage.local.set({
    'ip': document.getElementById('ip').value,
    'host': document.getElementById('host').value,
    'ssl-checker': document.getElementById('ssl-checker').value,
    'trace-route': document.getElementById('trace-route').value,
    'ping': document.getElementById('ping').value,
    'dns-lookup': document.getElementById('dns-lookup').value,
    'whois-lookup': document.getElementById('whois-lookup').value,
    'http-headers': document.getElementById('http-headers').value
  }, () => {
    const status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(() => status.textContent = '', 750);
  });
}

function restore() {
  chrome.storage.local.get({
    'ip': 'http://www.tcpiputils.com/browse/ip-address/[ip]',
    'host': 'https://www.tcpiputils.com/browse/domain/[host]',
    'ssl-checker': 'https://www.sslshopper.com/ssl-checker.html#hostname=[host]',
    'trace-route': 'https://api.hackertarget.com/mtr/?q=[ip]',
    'ping': 'https://api.hackertarget.com/nping/?q=[ip]',
    'dns-lookup': 'https://api.hackertarget.com/dnslookup/?q=[host]',
    'whois-lookup': 'https://api.hackertarget.com/whois/?q=[ip]',
    'http-headers': 'https://api.hackertarget.com/httpheaders/?q=[host]'
  }, prefs => {
    Object.entries(prefs).forEach(([key, value]) => document.getElementById(key).value = value);
  });
}
document.addEventListener('DOMContentLoaded', restore);
document.getElementById('save').addEventListener('click', save);
