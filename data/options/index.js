'use strict';

var _ = id => chrome.i18n.getMessage(id);

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
    'tinyurl': document.getElementById('tinyurl').value,
    'dns-lookup': document.getElementById('dns-lookup').value,
    'whois-lookup': document.getElementById('whois-lookup').value,
    'http-headers': document.getElementById('http-headers').value,
    'custom-cmd-1': document.getElementById('custom-cmd-1').value,
    'custom-cmd-1-title': document.getElementById('custom-cmd-1-title').value,
    'custom-cmd-2': document.getElementById('custom-cmd-2').value,
    'custom-cmd-2-title': document.getElementById('custom-cmd-2-title').value
  }, () => {
    chrome.storage.local.set({
      'ssl-checker-menuitem': document.getElementById('ssl-checker-menuitem').checked,
      'trace-route-menuitem': document.getElementById('trace-route-menuitem').checked,
      'ping-menuitem': document.getElementById('ping-menuitem').checked,
      'tinyurl-menuitem': document.getElementById('tinyurl-menuitem').checked,
      'dns-lookup-menuitem': document.getElementById('dns-lookup-menuitem').checked,
      'whois-lookup-menuitem': document.getElementById('whois-lookup-menuitem').checked,
      'http-headers-menuitem': document.getElementById('http-headers-menuitem').checked,
      'copy-ip-menuitem': document.getElementById('copy-ip-menuitem').checked,
      'custom-cmd-1-menuitem': document.getElementById('custom-cmd-1-menuitem').checked,
      'custom-cmd-2-menuitem': document.getElementById('custom-cmd-2-menuitem').checked,
      'open-in-background': document.getElementById('open-in-background').checked,
      'open-adjacent': document.getElementById('open-adjacent').checked,
      'faqs': document.getElementById('faqs').checked
    }, () => {
      chrome.contextMenus.removeAll(() => {
        chrome.runtime.sendMessage({
          method: 'contexts'
        });
        const status = document.getElementById('status');
        status.textContent = _('optionsMSG');
        setTimeout(() => status.textContent = '', 750);
      });
    });
  });
}

function restore() {
  chrome.storage.local.get({
    'ip': 'http://www.tcpiputils.com/browse/ip-address/[ip]',
    'host': 'https://www.tcpiputils.com/browse/domain/[host]',
    'ssl-checker': 'https://www.sslshopper.com/ssl-checker.html#hostname=[host]',
    'trace-route': 'https://api.hackertarget.com/mtr/?q=[ip]',
    'ping': 'https://api.hackertarget.com/nping/?q=[ip]',
    'tinyurl': 'https://tinyurl.com/create.php?url=[url]',
    'dns-lookup': 'https://api.hackertarget.com/dnslookup/?q=[host]',
    'whois-lookup': 'https://api.hackertarget.com/whois/?q=[ip]',
    'http-headers': 'https://api.hackertarget.com/httpheaders/?q=[url]',
    'custom-cmd-1': '',
    'custom-cmd-1-title': '',
    'custom-cmd-2': '',
    'custom-cmd-2-title': ''
  }, prefs => {
    Object.entries(prefs).forEach(([key, value]) => document.getElementById(key).value = value);
  });
  chrome.storage.local.get({
    'ssl-checker-menuitem': true,
    'trace-route-menuitem': true,
    'ping-menuitem': true,
    'tinyurl-menuitem': true,
    'dns-lookup-menuitem': false,
    'whois-lookup-menuitem': true,
    'http-headers-menuitem': false,
    'copy-ip-menuitem': true,
    'custom-cmd-1-menuitem': false,
    'custom-cmd-2-menuitem': false,
    'open-in-background': false,
    'open-adjacent': true,
    'faqs': true
  }, prefs => {
    Object.entries(prefs).forEach(([key, value]) => document.getElementById(key).checked = value);
  });
}
document.addEventListener('DOMContentLoaded', restore);
document.getElementById('save').addEventListener('click', save);

// localization
[...document.querySelectorAll('[data-i18n]')].forEach(e => {
  const value = e.dataset.value;
  const message = chrome.i18n.getMessage(e.dataset.i18n);
  if (value) {
    e.setAttribute(value, message);
    console.log(value, message);
  }
  else {
    e.textContent = message;
  }
});
