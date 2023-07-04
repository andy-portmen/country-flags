const args = new URLSearchParams(location.search);

const copy = e => navigator.clipboard.writeText(args.get('content')).then(() => {
  setTimeout(() => close(), e && e.isTrusted ? 0 : 1000);
}).catch(e => {
  console.log('cannot copy', e);
});

copy();
document.getElementById('copy').addEventListener('click', copy);
