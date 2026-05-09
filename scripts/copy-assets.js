import { copyFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const nm = resolve(__dirname, '../node_modules');
const pub = resolve(__dirname, '../public');

mkdirSync(resolve(pub, 'fonts'), { recursive: true });
copyFileSync(resolve(nm, '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2'), resolve(pub, 'fonts/inter-latin-wght-normal.woff2'));
copyFileSync(resolve(nm, '@fontsource-variable/inter/files/inter-latin-wght-italic.woff2'), resolve(pub, 'fonts/inter-latin-wght-italic.woff2'));
copyFileSync(resolve(nm, 'alpinejs/dist/cdn.min.js'), resolve(pub, 'alpinejs.min.js'));
