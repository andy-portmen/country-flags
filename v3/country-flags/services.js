const services = {};

services.urls = {
  'what-is-my-ip': 'https://webbrowsertools.com/ip-address/',
  'what-is-my-ua': 'https://webbrowsertools.com/useragent/',
  'ip': 'https://dnslytics.com/ip/[ip]',
  'host': 'https://webbrowsertools.com/whois-lookup?query=[host]',
  'ssl-checker': 'https://www.sslshopper.com/ssl-checker.html#hostname=[host]',
  'trace-route': 'post:[["host", "[ip]"]]@https://www.ipaddressguide.com/traceroute',
  'ping': 'post:[["host", "[ip]"]]@https://www.ipaddressguide.com/ping',
  'tinyurl': 'https://tinyurl.com/create.php?url=[enurl]',
  'dns-lookup': 'https://mxtoolbox.com/SuperTool.aspx?action=a%3a[host]&run=toolpage',
  'whois-lookup': 'https://webbrowsertools.com/whois-lookup?query=[host]',
  'http-headers': 'post:[["url", "[enurl]"]]@https://www.stepforth.com/resources/server-header-checker-tool/',
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
  'copy-ip': '',
  'custom-cmd-1': '',
  'custom-cmd-2': '',
  'custom-cmd-3': '',
  'custom-cmd-4': '',
  'custom-cmd-5': ''
};

services.names = Object.keys(services.urls);
services.menuitems = () => services.names.filter(s => s !== 'ip' && s !== 'host').map(s => s + '-menuitem');

services.dictionary = {
  'what-is-my-ip': 'bgWhatIsMyIP',
  'what-is-my-ua': 'bgWhatIsMyUA',
  'ssl-checker': 'bgSSL',
  'trace-route': 'bgTrace',
  'ping': 'bgPing',
  'tinyurl': 'bgTinyURL',
  'dns-lookup': 'bgDNS',
  'whois-lookup': 'bgWHOIS',
  'http-headers': 'bgHeaders',
  'copy-ip': 'bgCopy',
  'alexa': 'bgAlexa',
  'wot': 'bgWOT',
  'virustotal': 'bgVirustotal',
  'isitdownrightnow': 'bgIsitdownrightnow',
  'googletranslate': 'bgGoogletranslate',
  'googlecache': 'bgGooglecache',
  'wikipediadomain': 'bgWikipediadomain',
  'intodns': 'bgIntodns',
  'netcraft': 'bgNetcraft',
  'webaim': 'bgWebaim',
  'nuvalidator': 'bgNuValidator',
  'css-validator': 'bgCSSValidator',
  'w3c-validator': 'bgW3CValidator',
  'archive': 'bgArchive',
  'google': 'bgGoogle',
  'wolframalpha': 'bgWolframalpha'
};

services.default = s => {
  const list = ['what-is-my-ip-menuitem', 'tinyurl-menuitem', 'wot-menuitem',
    'virustotal-menuitem', 'googletranslate-menuitem'];
  return list.indexOf(s) !== -1;
};
