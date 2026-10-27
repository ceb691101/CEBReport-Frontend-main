import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { resolve, join } from 'node:path';

// Run with Vite on port 5173. CHROME_PATH can override the local Chrome install.
const temp = resolve('node_modules/.tmp');
mkdirSync(temp, { recursive: true });
const entry = join(temp, 'pucsl-division-preview.tsx');
const html = join(temp, 'pucsl-division-preview.html');
writeFileSync(entry, `
import React from 'react';
import { createRoot } from 'react-dom/client';
import PUCSLSolarConnection from '/src/mainTopics/PUCSL/PUCSLSolarConnection';
window.divisionRequests = 0;
window.fetch = async url => {
 let data;
 if (String(url).endsWith('/ordinary/region')) {
  window.divisionRequests++;
  await new Promise(resolve => setTimeout(resolve, 200));
  if (window.divisionRequests === 1) return Response.json({ data: null, errorMessage: 'Database connection failed.' });
  data = ['R1','R2','R3','R4'].map(RegionCode => ({ RegionCode }));
 } else if (String(url).endsWith('/ordinary/province')) data = [{ ProvinceCode: '1', ProvinceName: 'WPN' }];
 else if (String(url).endsWith('/areas/billcycle/min')) data = { MaxBillCycle: '457', BillCycles: ['Sep 26'] };
 else throw new Error('Unexpected request: ' + url);
 return Response.json({ data, errorMessage: null });
};
createRoot(document.getElementById('root')).render(<PUCSLSolarConnection />);
`);
writeFileSync(html, '<!doctype html><html><body><div id="root"></div><script type="module" src="./pucsl-division-preview.tsx"></script></body></html>');
const profile = mkdtempSync(join(temp, 'pucsl-browser-'));
const browser = spawn(process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', [
 '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
 '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore', windowsHide: true });
browser.on('error', error => { console.error(error); });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(check) {
 const deadline = Date.now() + 45000;
 while (Date.now() < deadline) { const value = await check(); if (value) return value; await pause(100); }
 throw new Error('Timed out waiting for browser or division lookup.');
}
let socket;
let command;
try {
 const portFile = join(profile, 'DevToolsActivePort');
 await until(() => existsSync(portFile));
 const port = readFileSync(portFile, 'utf8').split('\n')[0].trim();
 const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
 socket = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl);
 await new Promise((resolve, reject) => { socket.addEventListener('open', resolve); socket.addEventListener('error', reject); });
 let sequence = 0;
 const pending = new Map();
 const errors = [];
 socket.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  if (message.id) {
   const request = pending.get(message.id);
   if (request) { pending.delete(message.id); message.error ? request.reject(message.error) : request.resolve(message.result); }
  }
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
 });
 command = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params }));
 });
 const evaluate = async expression => {
  const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
 };
 const select = (index, value) => evaluate(`(() => {
  const el = document.querySelectorAll('select')[${index}];
  el.value = ${JSON.stringify(value)}; el.dispatchEvent(new Event('change', { bubbles: true }));
 })()`);
 await command('Page.enable');
 await command('Runtime.enable');
 await command('Page.navigate', { url: 'http://127.0.0.1:5173/node_modules/.tmp/pucsl-division-preview.html' });
 await until(() => evaluate(`document.querySelectorAll('select').length === 5`));
 await select(0, 'Division');
 await until(() => evaluate(`Boolean(document.querySelector('[role=alert]'))`));
 assert.equal(await evaluate(`document.querySelector('[role=alert] p').textContent`), 'Database connection failed.');
 assert.equal(await evaluate(`document.getElementById('pucsl-division').disabled`), true);
 assert.equal(await evaluate(`document.getElementById('pucsl-division').value`), '');
 assert.equal(await evaluate(`document.querySelector('button[type=submit]').disabled`), true);
 await evaluate(`document.querySelector('[role=alert] button').click()`);
 await until(() => evaluate(`document.getElementById('pucsl-division').options.length === 5`));
 assert.deepEqual(await evaluate(`Array.from(document.getElementById('pucsl-division').options).map(o => o.value)`), ['', 'R1', 'R2', 'R3', 'R4']);
 assert.equal(await evaluate(`Boolean(document.querySelector('[role=alert]'))`), false);
 assert.equal(await evaluate(`document.getElementById('pucsl-division').disabled`), false);
 assert.equal(await evaluate(`window.divisionRequests`), 2);
 await select(1, 'R1');
 await until(() => evaluate(`!document.querySelectorAll('select')[2].disabled`));
 await select(2, '457');
 await select(3, 'TotalSolarCustomers');
 await until(() => evaluate(`!document.querySelector('button[type=submit]').disabled`));
 // A pending response from a previous category must not update the current one.
 await select(0, 'Province');
 await select(0, 'Division');
 await select(0, 'Province');
 await pause(300);
 assert.equal(await evaluate(`document.querySelectorAll('select')[1].options[1].value`), '1');
 assert.deepEqual(errors, []);
 console.log('PASS: API errors, disabled invalid selections, retry recovery, R1–R4 options, form progression, and category switching.');
} finally {
 if (command) await command('Browser.close').catch(() => {});
 socket?.close();
 if (browser.exitCode === null) browser.kill();
 unlinkSync(entry);
 unlinkSync(html);
}
