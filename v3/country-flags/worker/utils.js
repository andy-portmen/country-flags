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

utils.translate = async id => {
  const lang = navigator.language.split('-')[0];
  utils.translate.objects = utils.translate.objects || await Promise.all([
    fetch('_locales/' + lang + '/messages.json').then(r => r.json()).catch(() => ({})),
    fetch('_locales/en/messages.json').then(r => r.json())
  ]);
  return utils.translate.objects[0][id]?.message || utils.translate.objects[1][id]?.message || id;
};

utils.notify = e => chrome.notifications.create(null, {
  type: 'basic',
  iconUrl: '/data/icons/48.png',
  title: 'Country Flags & IP Whois',
  message: e.message || e
});
