const args = new URLSearchParams(location.search);

const copy = () => navigator.clipboard.writeText(args.get('content')).then(() => {
  setTimeout(() => window.close(), 1000);
});

copy();
document.getElementById('copy').addEventListener('click', copy);
