const args = new URLSearchParams(location.search);

const form = document.createElement('form');
form.setAttribute('method', 'post');
form.setAttribute('accept-charset', 'UTF-8');
form.setAttribute('action', args.get('href'));

for (const [name, value] of JSON.parse(args.get('data'))) {
  const input = document.createElement('input');
  input.type = 'hidden';
  input.name = name;
  input.value = value;
  form.appendChild(input);
}
document.body.appendChild(form);
form.submit();
