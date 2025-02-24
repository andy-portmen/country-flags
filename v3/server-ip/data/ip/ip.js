'use strict';

const args = new URLSearchParams(location.search);
const ip = args.get('ip');
const flag = args.get('flag');

chrome.storage.local.get({
  'ip-css': ''
}, prefs => {
  document.getElementById('css').textContent = prefs['ip-css'];
});

const a = document.querySelector('a');
a.textContent = ip;
chrome.storage.local.get({
  'info': 'https://webbrowsertools.com/whois-lookup/?query=[url]'
}, prefs => {
  a.href = prefs.info
    .replace(/\[ip\]/g, ip)
    .replace(/\[url\]/g, encodeURIComponent(args.get('url')));
});

if (flag) {
  document.querySelector('img').src = './flags/' + flag + '.png';
}
else {
  const error = args.get('error');
  document.querySelector('img').src = './error.png';
  a.title = error;
}

document.addEventListener('click', e => {
  const cmd = e.target.dataset.cmd;
  if (cmd === 'copy') {
    navigator.clipboard.writeText(ip).catch(e => {
      const input = document.getElementById('clipboard');
      input.value = ip;
      input.select();
      if (document.execCommand('copy') === false) {
        alert(e.message);
      }
    });
  }
  else if (cmd) {
    chrome.runtime.sendMessage({cmd});
  }
});
