'use strict';

var services = {};

services.urls = {
  'ip': 'http://www.tcpiputils.com/browse/ip-address/[ip]',
  'host': 'https://www.tcpiputils.com/browse/domain/[host]',
  'ssl-checker': 'https://www.sslshopper.com/ssl-checker.html#hostname=[host]',
  'trace-route': 'https://api.hackertarget.com/mtr/?q=[ip]',
  'ping': 'https://api.hackertarget.com/nping/?q=[ip]',
  'tinyurl': 'https://tinyurl.com/create.php?url=[enurl]',
  'dns-lookup': 'https://api.hackertarget.com/dnslookup/?q=[host]',
  'whois-lookup': 'https://api.hackertarget.com/whois/?q=[ip]',
  'http-headers': 'https://api.hackertarget.com/httpheaders/?q=[url]',
  'alexa': 'https://alexa.com/siteinfo/[host]',
  'wot': 'https://www.mywot.com/scorecard/[host]',
  'virustotal': 'https://www.virustotal.com/#/domain/[host]',
  'isitdownrightnow': 'https://www.isitdownrightnow.com/[host].html',
  'googletranslate': 'https://translate.google.com/translate?tl=[lang]&u=[enurl]',
  'googlecache': 'https://webcache.googleusercontent.com/search?q=cache:[enurl]',
  'wikipediadomain': 'https://en.wikipedia.org/wiki/Special:Search?search=[host]&go=Go&variant=en-us',
  'intodns': 'https://intodns.com/[host]',
  'netcraft': 'http://toolbar.netcraft.com/site_report?url=[host]',
  'webaim': 'http://wave.webaim.org/report#/[url]',
  'nuvalidator': 'https://validator.w3.org/nu/?doc=[enurl]',
  'css-validator': 'https://jigsaw.w3.org/css-validator/validator?uri=[curl]',
  'w3c-validator': 'https://validator.w3.org/check?uri=[curl]',
  'archive': 'https://web.archive.org/web/*/[curl]',
  'google': 'https://www.google.com/search?q=site:[host]',
  'wolframalpha': 'https://www.wolframalpha.com/input/?i=[host]',
  'custom-cmd-1': '',
  'custom-cmd-2': '',
  'custom-cmd-3': '',
  'custom-cmd-4': '',
  'custom-cmd-5': ''
};

services.dictionary = {
  'ssl-checker': chrome.i18n.getMessage('bgSSL'),
  'trace-route': chrome.i18n.getMessage('bgTrace'),
  'ping': chrome.i18n.getMessage('bgPing'),
  'tinyurl': chrome.i18n.getMessage('bgTinyURL'),
  'dns-lookup': chrome.i18n.getMessage('bgDNS'),
  'whois-lookup': chrome.i18n.getMessage('bgWHOIS'),
  'http-headers': chrome.i18n.getMessage('bgHeaders'),
  'copy-ip': chrome.i18n.getMessage('bgCopy'),
  'alexa': chrome.i18n.getMessage('bgAlexa'),
  'wot': chrome.i18n.getMessage('bgWOT'),
  'virustotal': chrome.i18n.getMessage('bgVirustotal'),
  'isitdownrightnow': chrome.i18n.getMessage('bgIsitdownrightnow'),
  'googletranslate': chrome.i18n.getMessage('bgGoogletranslate'),
  'googlecache': chrome.i18n.getMessage('bgGooglecache'),
  'wikipediadomain': chrome.i18n.getMessage('bgWikipediadomain'),
  'intodns': chrome.i18n.getMessage('bgIntodns'),
  'netcraft': chrome.i18n.getMessage('bgNetcraft'),
  'webaim': chrome.i18n.getMessage('bgWebaim'),
  'nuvalidator': chrome.i18n.getMessage('bgNuValidator'),
  'css-validator': chrome.i18n.getMessage('bgCSSValidator'),
  'w3c-validator': chrome.i18n.getMessage('bgW3CValidator'),
  'archive': chrome.i18n.getMessage('bgArchive'),
  'google': chrome.i18n.getMessage('bgGoogle'),
  'wolframalpha': chrome.i18n.getMessage('bgWolframalpha')
};

services.names = () => Object.keys(services.urls);
services.menuitems = () => Object.keys(services.urls).filter(s => s !== 'ip' && s !== 'host').map(s => s + '-menuitem');

services.default = s => {
  const list = ['tinyurl-menuitem', 'whois-lookup-menuitem', 'wot-menuitem',
    'virustotal-menuitem', 'googletranslate-menuitem', 'archive-menuitem'];
  return list.indexOf(s) !== -1;
};
