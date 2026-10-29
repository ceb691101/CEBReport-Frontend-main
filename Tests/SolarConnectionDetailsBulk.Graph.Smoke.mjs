import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { resolve, join } from 'node:path';

// Run with Vite on port 5173. Add --payment for Bulk Payment or --retail for Retail Payment.
const retail = process.argv.includes('--retail');
const payment = process.argv.includes('--payment') || retail;
const reportName = retail ? 'SolarPaymentRetail' : payment ? 'SolarPaymentBulk' : 'SolarConnectionDetailsBulk';
const graphButton = payment ? 'View Graph' : 'Graph View';
const salesField = payment ? 'UnitSale' : 'NetUnits';
const initialCycle = payment ? '453' : '451';
// Vite does not watch node_modules fixtures, so each run needs fresh module URLs.
const preview = `${retail ? 'retail-payment-sales-preview' : payment ? 'bulk-payment-sales-preview' : 'bulk-sales-preview'}-${Date.now()}`;
const temp = resolve('node_modules/.tmp');
mkdirSync(temp, { recursive: true });
const entry = join(temp, `${preview}.tsx`);
const html = join(temp, `${preview}.html`);
writeFileSync(entry, `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { UserProvider } from '/src/contexts/UserContext';
import Report from '/src/mainTopics/SolarInformation/${reportName}';
import '/src/index.css';
localStorage.setItem('userData', JSON.stringify({ Userno: '', Logged: true, Level: 80 }));
window.reportRequests = [];
window.summaryRequests = [];
window.graphMode = 'normal';
const row = { AccountNumber:'TEST001', Name:'Test customer', Tariff:'GP', NetType:'2', MeterNumber:'M01',
 PresentReadingDate:'2026-03-31', PreviousReadingDate:'2026-02-28', PresentReadingImport:120, PreviousReadingImport:20,
 UnitsIn:100, PresentReadingExport:999999, PreviousReadingExport:0, UnitsOut:999999, NetUnits:100, UnitCost:22,
 AgreementDate:'2024-01-01', Division:'R2', Province:'Province A', Area:'Area A', AreaCode:'01',
 CustomerName:'Test customer', PanelCapacity:10,EnergyExported:999999,EnergyImported:100,BFUnits:0,
 KwhCharge:10,FixedCharge:5,FuelCharge:0,UnitsInBill:100,Period:31,CFUnits:0,Rate:22,UnitSale:222222,KwhSales:999999,
 BankCode:null,BranchCode:null,BankAccountNumber:null };
window.fetch = async (input, options = {}) => {
 const url = new URL(String(input), location.origin);
 let data;
 if(url.pathname.endsWith('/${retail ? 'ordinary' : 'bulk'}/netmtcons/billcycle/max')) data = {MaxBillCycle:'456',BillCycles:['Aug 26','Jul 26','Jun 26','May 26','Apr 26','Mar 26']};
 else if(url.pathname.endsWith('/${retail ? 'ordinary' : 'bulk'}/areas')) data = [{AreaCode:'01',AreaName:'Area A'}];
 else if(url.pathname.endsWith('/${retail ? 'ordinary' : 'bulk'}/province')) data = [{ProvinceCode:'01',ProvinceName:'Province A'},{ProvinceCode:'03',ProvinceName:'Colombo City'}];
 else if(url.pathname.endsWith('/${retail ? 'ordinary' : 'bulk'}/region')) data = [{RegionCode:'R1'},{RegionCode:'R2'}];
 else if(url.pathname.endsWith('/retail/summary') || url.pathname.endsWith('/retail/summary-bulk')) {
  const query = Object.fromEntries(url.searchParams);window.summaryRequests.push({path:url.pathname,...query});
  const cycle=query.billCycle || query.calcCycle;
  const values=url.pathname.endsWith('summary-bulk') ? [999999] : cycle==='${initialCycle}' ? [100] : {'454':[1000,500],'455':[0],'456':[3000.5,1999.5]}[cycle];
  data=values.map(value=>({NetType:'Net Plus',NoOfAccounts:2,EnergyExported:100,EnergyImported:10,UnitSaleKwh:value*(query.cycleType==='C'?2:1),UnitSaleRs:999999,KwhPayableBalance:0}));
 }
 else if(url.pathname.endsWith('/${retail ? 'retail/detailed' : payment ? 'solarPayment/bulk' : 'solarConnectionDetails/bulk'}')) {
  const query = Object.fromEntries(url.searchParams); window.reportRequests.push(query);
  const cycle = query.billCycle || query.calcCycle;
  if(cycle === '${initialCycle}') data = [{...row,BillCycle:cycle}];
  else {
   await new Promise(resolve => setTimeout(resolve, {'454':150,'455':20,'456':70}[cycle]));
   if(options.signal?.aborted) throw new DOMException('Aborted','AbortError');
   if(window.graphMode === 'fail' && cycle === '455') return Response.json({data:null,errorMessage:'Service temporarily unavailable.'});
   const values = {'454':[1000,'500'],'455':[0],'456':[3000.5,1999.5]}[cycle];
   data = window.graphMode === 'empty' ? [] : values.map((value,i)=>({...row,AccountNumber:'TEST'+i,${salesField}:query.cycleType==='C'?Number(value)*2:value,BillCycle:cycle}));
   if(window.graphMode === 'invalid' && cycle === '455') data[0].${salesField} = null;
  }
 } else throw new Error('Unexpected request: '+url.pathname);
 return Response.json({data,errorMessage:null});
};
window.open = () => ({document:{write:text=>window.pdfHTML=text,close(){}},focus(){},print(){},close(){}});
createRoot(document.getElementById('root')).render(<UserProvider><Report /></UserProvider>);
`);
writeFileSync(html, `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="./${preview}.tsx"></script></body></html>`);
const profile = mkdtempSync(join(temp, 'bulk-sales-browser-'));
const browser = spawn(process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', [
 '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
 '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore', windowsHide: true });
let browserError;
browser.on('error', error => { browserError = error; });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(check) {
 const deadline = Date.now() + 45000;
 while(Date.now() < deadline) { if(browserError) throw browserError; const value = await check(); if(value) return value; await pause(100); }
 throw new Error('Timed out waiting for the bulk sales report.');
}
let socket, command;
try {
 const portFile = join(profile, 'DevToolsActivePort');
 await until(() => existsSync(portFile));
 const port = readFileSync(portFile, 'utf8').split('\n')[0].trim();
 const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
 socket = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl);
 await new Promise((resolve,reject) => {socket.addEventListener('open',resolve);socket.addEventListener('error',reject);});
 let sequence = 0;
 const pending = new Map(), errors = [];
 socket.addEventListener('message', event => {
  const message = JSON.parse(event.data), request = pending.get(message.id);
  if(request) {pending.delete(message.id);clearTimeout(request.timer);message.error ? request.reject(message.error) : request.resolve(message.result);}
  if(message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
 });
 command = (method,params={}) => new Promise((resolve,reject) => {
  const id = ++sequence, timer = setTimeout(()=>{pending.delete(id);reject(new Error(method+' timed out'));},45000);
  pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));
 });
 const evaluate = async expression => {
  const result = await command('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
  if(result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
 };
 const select = (index,value) => evaluate(`(() => {const el=document.querySelectorAll('select')[${index}];el.value=${JSON.stringify(value)};el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
 const click = async text => {
  await until(() => evaluate(`Array.from(document.querySelectorAll('button')).some(b=>b.textContent.trim()===${JSON.stringify(text)}&&!b.disabled)`));
  return evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()===${JSON.stringify(text)}).click()`);
 };
 const graphRows = () => evaluate(`Array.from(document.querySelectorAll('#bulk-solar-sales-graph tbody tr'),r=>Array.from(r.cells,c=>c.textContent))`);
 const readyGraph = () => until(() => evaluate(`Boolean(document.querySelector('#bulk-solar-sales-graph tbody'))`));
 await command('Page.enable');await command('Runtime.enable');
 await command('Emulation.setDeviceMetricsOverride',{width:1360,height:900,deviceScaleFactor:1,mobile:false});
 await command('Page.navigate',{url:`http://127.0.0.1:5173/node_modules/.tmp/${preview}.html`});
 if(retail) {
  await until(() => evaluate(`document.querySelectorAll('select')[0]?.options.length===3`));
  await select(0,'Bill Cycle');
  await until(() => evaluate(`document.querySelectorAll('select')[1]?.options.length===7`));
  await select(1,initialCycle);await select(2,'Detailed Report');await select(3,'Province');
  await until(() => evaluate(`document.querySelectorAll('select')[4]?.options.length===3`));
  await select(4,'03');await select(5,'Net Plus');
 } else {
 await until(() => evaluate(`document.querySelectorAll('select')[0]?.options.length===7`));
 await select(0,initialCycle);
 if(payment) {
  await select(1,'Province');
  await until(() => evaluate(`document.querySelectorAll('select')[2]?.options.length===3`));
  await select(2,'03');await select(3,'Net Plus');
 } else {
  await select(1,'Net Accounting');await select(2,'Division');
  await until(() => evaluate(`document.querySelectorAll('select')[3]?.options.length===3`));
  await select(3,'R2');
 }
 }
 await click('Generate Report');
 await until(() => evaluate(`Boolean(Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()===${JSON.stringify(graphButton)}))`));
 assert.equal(await evaluate('window.reportRequests.length'),1,'Graph data must load only when requested.');
 await click(graphButton);await readyGraph();
 assert.deepEqual(await graphRows(),[['454 - Jun 26','1,500'],['455 - Jul 26','0'],['456 - Aug 26','5,000']]);
 const requests = await evaluate('window.reportRequests.slice(1)');
 assert.deepEqual(requests.map(r=>r.billCycle),['454','455','456']);
 for(const request of requests) assert.deepEqual(request,retail
  ? {billCycle:request.billCycle,netType:'3',reportType:'province',typeCode:'03',cycleType:'A'} : payment
  ? {billCycle:request.billCycle,netType:'3',reportType:'Province',typeCode:'03'}
  : {addedBillCycle:request.billCycle,billCycle:request.billCycle,netType:'2',reportType:'region',typeCode:'R2'});
 assert.ok(await evaluate(`document.querySelectorAll('#bulk-solar-sales-graph .recharts-bar-rectangle').length>=2`));
 await click('PDF');assert.ok((await evaluate('window.pdfHTML')).includes('TEST001'),'PDF must still use the report table in graph view.');
 const screenshot = await command('Page.captureScreenshot',{format:'png'});
 writeFileSync(join(temp,retail ? 'retail-payment-sales-graph.png' : payment ? 'bulk-payment-sales-graph.png' : 'bulk-sales-graph.png'),Buffer.from(screenshot.data,'base64'));
 await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await pause(200);
 assert.ok(await evaluate(`document.getElementById('bulk-solar-sales-graph').getBoundingClientRect().width<=390`));
 await click('Table View');assert.equal(await evaluate(`Boolean(document.getElementById('bulk-solar-sales-graph'))`),false);
 console.log('PASS: Three ordered bars, numeric sales totals, zero sales, preserved scope, PDF, mobile layout, and table toggle.');

 await evaluate(`window.graphMode='fail'`);await click(graphButton);
 await until(() => evaluate(`Boolean(document.querySelector('#bulk-solar-sales-graph [role=alert]'))`));
 assert.ok(await evaluate(`document.querySelector('#bulk-solar-sales-graph [role=alert]').textContent.includes('455: Service temporarily unavailable.')`));
 assert.equal(await evaluate(`Boolean(document.querySelector('#bulk-solar-sales-graph tbody'))`),false);
 await evaluate(`window.graphMode='normal'`);await click('Retry graph');await readyGraph();
 assert.equal((await graphRows())[0][1],'1,500');
 console.log('PASS: Failed cycles show an error and Retry recovers without displaying fabricated totals.');

 await click('Table View');await evaluate(`window.graphMode='empty'`);await click(graphButton);await readyGraph();
 assert.deepEqual((await graphRows()).map(row=>row[1]),['No data','No data','No data']);
 await click('Table View');await evaluate(`window.graphMode='invalid'`);await click(graphButton);
 await until(() => evaluate(`Boolean(document.querySelector('#bulk-solar-sales-graph [role=alert]'))`));
 assert.ok(await evaluate(`document.querySelector('#bulk-solar-sales-graph [role=alert]').textContent.includes('Invalid kWh sales data')`));
 await click('Back to Form');
 if(retail) {await select(4,'01');await select(5,'Net Accounting');}
 else if(payment) {await select(2,'01');await select(3,'Net Accounting');}
 else {await select(1,'Net Plus');await select(3,'R1');}
 await click('Generate Report');
 await evaluate(`window.graphMode='normal'`);await click(graphButton);await readyGraph();
 const updated = await evaluate('window.reportRequests.slice(-3)');
 assert.ok(updated.every(request=>request.typeCode===(payment ? '01' : 'R1')&&request.netType===(payment ? '2' : '3')));
 console.log('PASS: Empty/invalid data is distinguished from zero; regenerated reports use the new filters.');

 if(retail) {
  await click('Back to Form');await select(0,'Calculation Cycle');
  await until(() => evaluate(`document.querySelectorAll('select')[1]?.options[1]?.textContent.trim()==='Aug 26'`));
  await select(1,initialCycle);await click('Generate Report');await click(graphButton);await readyGraph();
  const calcRequests=await evaluate('window.reportRequests.slice(-3)');
  assert.deepEqual(calcRequests.map(request=>request.calcCycle),['454','455','456']);
  assert.ok(calcRequests.every(request=>request.cycleType==='C'&&!('billCycle' in request)&&request.typeCode==='01'&&request.netType==='2'));
  assert.deepEqual((await graphRows()).map(row=>row[0]),['454 - Jun 26','455 - Jul 26','456 - Aug 26']);
  assert.deepEqual((await graphRows()).map(row=>row[1]),['3,000','0','10,000']);
  assert.ok(await evaluate(`document.querySelector('#bulk-solar-sales-graph h3').textContent.includes('Calculation Cycle')`));
  assert.ok(await evaluate(`document.querySelector('#bulk-solar-sales-graph svg').textContent.includes('Calculation cycle')`));
  console.log('PASS: Calculation-cycle graphs use calculation-cycle data and labels with the selected filters.');

  await click('Back to Form');await select(2,'Summary Report');await click('Generate Report');
  await evaluate('window.summaryRequests=[]');await click(graphButton);await readyGraph();
  assert.deepEqual((await graphRows()).map(row=>row[1]),['3,000','0','10,000']);
  const summaries=await evaluate('window.summaryRequests');
  assert.equal(summaries.length,3);
  assert.ok(summaries.every(request=>request.path.endsWith('/retail/summary')&&request.cycleType==='C'&&!('billCycle' in request)));
  assert.ok(await evaluate(`document.getElementById('bulk-solar-sales-graph').textContent.includes('Retail customers across all net types.')`));
  console.log('PASS: Calculation-cycle Summary charts only Retail kWh units, excluding Bulk totals and currency amounts.');

  await click('Back to Form');await select(0,'Bill Cycle');
  await until(() => evaluate(`document.querySelectorAll('select')[1]?.options[1]?.textContent.trim()==='456 - Aug 26'`));
  await select(1,initialCycle);await click('Generate Report');await evaluate('window.summaryRequests=[]');
  await click(graphButton);await readyGraph();
  assert.deepEqual((await graphRows()).map(row=>row[1]),['1,500','0','5,000']);
  const billSummaries=await evaluate('window.summaryRequests');
  assert.ok(billSummaries.every(request=>request.cycleType==='A'&&!('calcCycle' in request)));
  assert.ok(await evaluate(`document.querySelector('#bulk-solar-sales-graph h3').textContent.includes('Bill Cycle')`));
  console.log('PASS: Switching back to Bill Cycle restores bill-cycle data and labels.');
 }
 assert.deepEqual(errors,[]);
} finally {
 if(command) await command('Browser.close').catch(()=>{});
 socket?.close();if(browser.exitCode===null) browser.kill();
 unlinkSync(entry);unlinkSync(html);
}
