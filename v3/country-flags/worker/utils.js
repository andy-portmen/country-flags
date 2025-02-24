const utils = {};
utils.isPrivate = ip => ip === '::1' ||
    ip === 'd0::11' ||
    ip === '0.0.0.0' ||
    ip.match(utils.isPrivate.rs[0]) !== null ||
    ip.match(utils.isPrivate.rs[1]) !== null ||
    ip.match(utils.isPrivate.rs[2]) !== null ||
    ip.match(utils.isPrivate.rs[3]) !== null ||
    ip.match(utils.isPrivate.rs[4]) !== null ||
    ip.match(utils.isPrivate.rs[5]) !== null ||
    ip.match(utils.isPrivate.rs[6]) !== null;
utils.isPrivate.rs = [
  /^10\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})/,
  /^192\.168\.([0-9]{1,3})\.([0-9]{1,3})/,
  /^172\.(1[6-9]|2\d|3[0-1])\.([0-9]{1,3})\.([0-9]{1,3})/,
  /^127\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})/,
  /^169\.254\.([0-9]{1,3})\.([0-9]{1,3})/,
  /^fc00:/,
  /^fe80:/
];

utils.notify = e => chrome.notifications.create({
  type: 'basic',
  iconUrl: '/data/icons/48.png',
  title: 'Country Flags & IP Whois',
  message: e.message || e
}, id => setTimeout(chrome.notifications.clear, 3000, id));

utils.translate = id => chrome.i18n.getMessage(id) || id;
