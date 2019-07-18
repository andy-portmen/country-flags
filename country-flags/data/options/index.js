/* globals services */
'use strict';

var _ = id => chrome.i18n.getMessage(id);
var info = document.getElementById('status');

var native = callback => chrome.runtime.sendNativeMessage('com.add0n.node', {
  cmd: 'version'
}, callback);
document.getElementById('dns').addEventListener('change', ({target}) => {
  if (target.checked) {
    native(response => {
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
  const prefs = services.names.reduce((p, c) => {
    p[c] = document.getElementById(c).value;
    return p;
  }, {});
  chrome.storage.local.set(Object.assign(prefs, {
    'custom-cmd-1-title': document.getElementById('custom-cmd-1-title').value,
    'custom-cmd-2-title': document.getElementById('custom-cmd-2-title').value,
    'custom-cmd-3-title': document.getElementById('custom-cmd-3-title').value,
    'custom-cmd-4-title': document.getElementById('custom-cmd-4-title').value,
    'custom-cmd-5-title': document.getElementById('custom-cmd-5-title').value,
    'custom-command': document.getElementById('custom-command').value,
    'display-delay': Math.max(0, Number(document.getElementById('display-delay').value))
  }), () => {
    if (document.getElementById('dns').checked) {
      native(response => {
        if (!response) {
          chrome.tabs.create({
            url: '/data/helper/index.html'
          });
          document.getElementById('custom-command').value = '';
          chrome.storage.local.set({
            'custom-command': ''
          });
        }
      });
    }
    localStorage.setItem('type', document.getElementById('subframes').checked ? 'main_frame, sub_frame' : 'main_frame');

    const prefs = services.menuitems().reduce((p, c) => {
      p[c] = document.getElementById(c).checked;
      return p;
    }, {});
    chrome.storage.local.set(Object.assign(prefs, {
      'open-in-background': document.getElementById('open-in-background').checked,
      'open-adjacent': document.getElementById('open-adjacent').checked,
      'faqs': document.getElementById('faqs').checked
    }), () => {
      chrome.contextMenus.removeAll(() => {
        chrome.runtime.sendMessage({
          method: 'contexts'
        });
        info.textContent = _('optionsMSG');
        setTimeout(() => info.textContent = '', 750);
      });
    });
  });
}

function restore() {
  chrome.storage.local.get(Object.assign({
    'custom-cmd-1-title': '',
    'custom-cmd-2-title': '',
    'custom-cmd-3-title': '',
    'custom-cmd-4-title': '',
    'custom-cmd-5-title': '',
    'custom-command': '',
    'display-delay': navigator.userAgent.indexOf('Edge') === -1 ? 0 : 1
  }, services.urls), prefs => {
    Object.entries(prefs).forEach(([key, value]) => document.getElementById(key).value = value);
  });

  const prefs = services.menuitems().reduce((p, c) => {
    p[c] = services.default(c);
    return p;
  }, {});
  chrome.storage.local.get(Object.assign(prefs, {
    'open-in-background': false,
    'open-adjacent': true,
    'faqs': true
  }), prefs => {
    Object.entries(prefs).forEach(([key, value]) => document.getElementById(key).checked = value);
  });
  document.getElementById('subframes').checked = localStorage.getItem('type').indexOf('sub_frame') !== -1;
}
document.addEventListener('DOMContentLoaded', restore);
document.getElementById('save').addEventListener('click', save);
// reset
document.getElementById('reset').addEventListener('click', e => {
  if (e.detail === 1) {
    info.textContent = 'Double-click to reset!';
    window.setTimeout(() => info.textContent = '', 750);
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
  url: chrome.runtime.getManifest().homepage_url + '?rd=donate'
}));


// localization
[...document.querySelectorAll('[data-i18n]')].forEach(e => {
  const value = e.dataset.value;
  const message = chrome.i18n.getMessage(e.dataset.i18n);
  if (value) {
    e.setAttribute(value, message);
  }
  else {
    e.textContent = message;
  }
});
