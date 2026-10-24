import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startWorkspace } from '../src/workspace-server.js';

test('Installer downloads list only complete named distribution files; source and user data stay private', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'ab-distribution-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const folder = join(root, '.suite-data', 'downloads');
  await mkdir(folder, { recursive: true });
  const name = 'AB-Suite-0.6.0-Windows-x64-Setup.exe';
  await writeFile(join(folder, name), 'review installer fixture');
  await writeFile(join(folder, 'private.json'), 'private');
  const suite = await startWorkspace({ port: 0, root });
  t.after(() => suite.close());
  const listing = await (await fetch(suite.url + '/suite/distribution')).json();
  assert.deepEqual(listing.files, [
    { name, bytes: 24, href: '/suite/download/' + name }
  ]);
  const response = await fetch(suite.url + listing.files[0].href);
  assert.equal(
    response.headers.get('content-disposition'),
    'attachment; filename="' + name + '"'
  );
  assert.equal(await response.text(), 'review installer fixture');
  const head = await fetch(suite.url + listing.files[0].href, {
    method: 'HEAD'
  });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  assert.equal(
    (await fetch(suite.url + '/suite/download/private.json')).status,
    404
  );
  assert.equal(
    (await fetch(suite.url + '/suite/download/%2e%2e%2fprivate.json')).status,
    404
  );
  assert.equal(
    (await fetch(suite.url + listing.files[0].href, { method: 'POST' })).status,
    405
  );
});

test('A source or installed copy without distribution artifacts has an honest empty download listing', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'ab-source-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const suite = await startWorkspace({ port: 0, root });
  t.after(() => suite.close());
  assert.deepEqual(
    await (await fetch(suite.url + '/suite/distribution')).json(),
    { files: [] }
  );
});
