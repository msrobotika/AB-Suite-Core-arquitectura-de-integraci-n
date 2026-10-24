/** Compile the reviewed message catalog without network or runtime translation services. MIT. */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const source = new URL('../web/locales/en.txt', import.meta.url);
const messages = {};
for (const [index, raw] of (await readFile(source, 'utf8')).replace(/^\uFEFF/, '').split(/\r?\n/).entries()) {
  if (!raw.trim()) continue;
  const separator = raw.indexOf(' => ');
  if (separator < 1) throw Error('Invalid locale message on line ' + (index + 1));
  const key = raw.slice(0, separator), value = raw.slice(separator + 4);
  if (!value || messages[key]) throw Error('Empty or duplicate locale message: ' + key);
  messages[key] = value;
}
await writeFile(new URL('../web/locales/en.js', import.meta.url), '// Reviewed UI messages; user documents are never translated. MIT.\nexport default ' + JSON.stringify(messages, null, 2) + ';\n');
console.log(Object.keys(messages).length + ' reviewed English messages compiled from ' + fileURLToPath(source));
