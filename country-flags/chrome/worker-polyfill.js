'use strict';

//if (navigator.userAgent.indexOf('Edge') !== -1) {
if (navigator.userAgent.indexOf('Edge') !== -1) {
  Worker = function(src) {
    const iframe = document.createElement('iframe');
    this.iframe = iframe;
    iframe.onload = () => {
      const win = iframe.contentWindow;
      win.importScripts = src => {
        const script = document.createElement('script');
        script.src = src;
        iframe.contentDocument.body.appendChild(script);
      };
      win.postMessage = data => this.onmessage({data});
      win.importScripts(src);
    };
    document.documentElement.appendChild(iframe);
  };
  Worker.prototype.postMessage = function(data) {
    this.iframe.contentWindow.onmessage({data});
  };
}
