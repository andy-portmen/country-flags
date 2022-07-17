const args = new URLSearchParams(location.search);

const copy = e => navigator.clipboard.writeText(args.get('content')).then(() => {
  setTimeout(() => window.close(), e && e.isTrusted ? 0 : 1000);
});

copy();
document.getElementById('copy').addEventListener('click', copy);
