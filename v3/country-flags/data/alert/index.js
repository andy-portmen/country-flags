'use strict';

const args = new URLSearchParams(location.search);

document.querySelector('pre').textContent = args.get('msg');
