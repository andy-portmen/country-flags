'use strict';

const args = new URLSearchParams(location.search);

chrome.storage.local.get({
  'ip-css': ''
}, prefs => {
  document.getElementById('css').textContent = prefs['ip-css'];
});

const a = document.querySelector('a');
a.textContent = args.get('ip');
a.href = '/';
a.dataset.cmd = 'open-external';
const flag = args.get('flag');
if (flag) {
  document.querySelector('img').src = './flags/' + flag + '.png';
}
else {
  document.querySelector('img').src = './error.png';
  a.title = args.get('error');
}

document.addEventListener('click', e => {
  const cmd = e.target.dataset.cmd;
  if (cmd === 'open-external') {
    e.preventDefault();
    chrome.storage.local.get({
      'info': 'https://isc.sans.edu/ipinfo.html?ip=[ip]'
    }, prefs => chrome.tabs.create({
      url: prefs.info.replace(/\[ip\]/g, args.get('ip'))
    }));
  }
  else if (cmd) {
    chrome.runtime.sendMessage({cmd});
  }
});
