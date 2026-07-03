import React, { useState, useEffect, useCallback } from 'react';

interface FinalizedAccountsRecord {
  AccountNumber: string;
  CurrentBalance: number;
  CustomerName: string;
  Address: string;
  LastReadDate: string;
  FinalizedDate: string;
  MeterNo1: string;
  LastRead1: string;
  MeterNo2: string;
  LastRead2: string;
  MeterNo3: string;
  LastRead3: string;
  SecurityDeposit: number;
}

interface ProvinceOption {
  ProvCode: string;
  ProvName: string;
}

interface AreaOption {
  AreaCode: string;
  AreaName: string;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const billCycleToLabel = (cycle: number): string => {
  const baseYear  = 1988;
  const baseMonth = 8;
  const totalMonths = baseMonth + (cycle - 1);
  const year  = baseYear + Math.floor(totalMonths / 12);
  const month = totalMonths % 12;
  const yy    = String(year).slice(-2);
  return `${cycle} - ${MONTHS[month]} ${yy}`;
};

const FinalizedAccounts: React.FC = () => {
  const maroon     = 'text-[#7A0000]';
  const maroonGrad = 'bg-gradient-to-r from-[#7A0000] to-[#A52A2A]';

  const [province,        setProvince]        = useState('');
  const [area,            setArea]            = useState('');
  const [month,           setMonth]           = useState('*** - All Months');
  const [balanceChecked,  setBalanceChecked]  = useState(false);
  const [balanceOperator, setBalanceOperator] = useState('>');
  const [balanceValue,    setBalanceValue]    = useState('0');
  const [daysChecked,     setDaysChecked]     = useState(false);
  const [daysOperator,    setDaysOperator]    = useState('>');
  const [daysValue,       setDaysValue]       = useState('0');

  const [provinces,        setProvinces]        = useState<ProvinceOption[]>([]);
  const [areas,            setAreas]            = useState<AreaOption[]>([]);
  const [billCycles,       setBillCycles]       = useState<string[]>([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);
  const [loadingAreas,     setLoadingAreas]     = useState(false);

  const [records,       setRecords]       = useState<FinalizedAccountsRecord[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportError,   setReportError]   = useState<string | null>(null);
  const [hasSearched,   setHasSearched]   = useState(false);

  const [snapProvName, setSnapProvName] = useState('');
  const [snapAreaName, setSnapAreaName] = useState('');
  const [snapMonth,    setSnapMonth]    = useState('');

  useEffect(() => {
    const fetchInitial = async () => {
      setLoadingDropdowns(true);
      try {
        const res = await fetch('/misapi/api/FinalizedAccounts/dropdowns', {
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setProvinces(data.Provinces || []);
        setBillCycles(data.BillCycles || []);
      } catch (err: any) {
        console.error('Failed to load dropdowns:', err.message);
      } finally {
        setLoadingDropdowns(false);
      }
    };
    fetchInitial();
  }, []);

  useEffect(() => {
    if (!province) { setAreas([]); setArea(''); return; }
    const fetchAreas = async () => {
      setLoadingAreas(true);
      try {
        const res = await fetch(
          `/misapi/api/FinalizedAccounts/dropdowns?provCode=${encodeURIComponent(province)}`,
          { headers: { Accept: 'application/json' } }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setAreas(data.Areas || []);
        setArea('');
      } catch (err: any) {
        console.error('Failed to load areas:', err.message);
      } finally {
        setLoadingAreas(false);
      }
    };
    fetchAreas();
  }, [province]);

  const fetchReport = useCallback(async () => {
    if (!province) { setReportError('Please select a province.'); return; }

    const provObj = provinces.find(p => p.ProvCode === province);
    const areaObj = areas.find(a => a.AreaCode === area);

    setSnapProvName(provObj?.ProvName ?? province);
    setSnapAreaName(areaObj?.AreaName ?? (area || 'All Areas'));
    setSnapMonth(month);

    setLoadingReport(true);
    setReportError(null);
    setRecords([]);

    const payload = {
      ProvinceCode:    province,
      AreaCode:        area || '',
      BillCycle:       month === '*** - All Months' ? '' : month,
      BalanceChecked:  balanceChecked,
      BalanceOperator: balanceOperator,
      BalanceValue:    balanceValue,
      DaysChecked:     daysChecked,
      DaysOperator:    daysOperator,
      DaysValue:       daysValue,
    };

    try {
      const res = await fetch('/misapi/api/FinalizedAccounts/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

      const data = await res.json();

      const errMsg = data.ErrorMessage ?? data.errorMessage ?? null;
      if (errMsg) { setReportError(errMsg); return; }

      const rows: FinalizedAccountsRecord[] = data.Records ?? data.records ?? data ?? [];

      if (!Array.isArray(rows) || rows.length === 0) {
        setReportError('No finalized accounts found for the selected criteria.');
        return;
      }

      setRecords(rows);
      setHasSearched(true);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setReportError('Request timed out. Please try again.');
      } else if (err.message?.includes('Failed to fetch')) {
        setReportError('Cannot connect to server. Please ensure the backend is running.');
      } else {
        setReportError(err.message || 'Failed to fetch report data.');
      }
    } finally {
      setLoadingReport(false);
    }
  }, [province, area, month, balanceChecked, balanceOperator, balanceValue,
      daysChecked, daysOperator, daysValue, provinces, areas]);

  const handleBackToForm = () => {
    setHasSearched(false);
    setRecords([]);
    setReportError(null);
  };

  const totalBalance = records.reduce((s, r) => s + (Number(r.CurrentBalance)  || 0), 0);
  const totalDeposit = records.reduce((s, r) => s + (Number(r.SecurityDeposit) || 0), 0);

  const esc = (v: unknown) => {
    const s = String(v ?? '');
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const handleExportCsv = () => {
    if (!records.length) return;
    const header = [
      'Account No', 'Current Balance', 'Customer', 'Address',
      'Last Read Date', 'Finalized Date',
      'Meter No 1', 'Last Read 1', 'Meter No 2', 'Last Read 2',
      'Meter No 3', 'Last Read 3', 'Security Deposit',
    ];
    const rows = records.map(r => [
      r.AccountNumber, Number(r.CurrentBalance).toFixed(2), r.CustomerName, r.Address,
      r.LastReadDate, r.FinalizedDate,
      r.MeterNo1, r.LastRead1, r.MeterNo2, r.LastRead2, r.MeterNo3, r.LastRead3,
      Number(r.SecurityDeposit).toFixed(2),
    ]);
    const csv  = [header, ...rows].map(row => row.map(esc).join(',')).join('\r\n');
    const link = document.createElement('a');
    link.href  = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    link.download = `FinalizedAccounts_${province}_${area || 'All'}.csv`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPdf = () => {
    if (!records.length) return;
    const title = 'Finalized Accounts';
    const rowsHtml = records.map((r, i) => `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#f5f5f5'}">
        <td>${esc(r.AccountNumber)}</td>
        <td style="text-align:right">${Number(r.CurrentBalance).toFixed(2)}</td>
        <td>${esc(r.CustomerName)}</td>
        <td>${esc(r.Address)}</td>
        <td>${esc(r.LastReadDate)}</td>
        <td>${esc(r.FinalizedDate)}</td>
        <td>${esc(r.MeterNo1)}</td>
        <td>${esc(r.LastRead1)}</td>
        <td>${esc(r.MeterNo2)}</td>
        <td>${esc(r.LastRead2)}</td>
        <td>${esc(r.MeterNo3)}</td>
        <td>${esc(r.LastRead3)}</td>
        <td style="text-align:right">${Number(r.SecurityDeposit).toFixed(2)}</td>
      </tr>`).join('');

    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${title}</title>
<style>
  body{font-family:Arial,sans-serif;margin:10mm;color:#111}
  h2{color:#7A0000;font-size:13px;margin-bottom:6px}
  .meta{font-size:11px;margin-bottom:12px}
  .meta span{font-weight:bold}
  table{width:100%;border-collapse:collapse;margin-top:8px}
  th{background:#b0e0e8;font-weight:bold;text-align:center;padding:4px 3px;border:1px solid #aaa;font-size:9px}
  td{padding:3px;border:1px solid #ccc;font-size:9px;vertical-align:top}
  .total-row td{background:#d3d3d3;font-weight:bold}
  @page{size:A4 landscape;margin:12mm}
</style>
</head><body>
<h2>${title}</h2>
<div class="meta">
  Province : <span>${snapProvName}</span> &nbsp;|&nbsp;
  Area : <span>${snapAreaName}</span> &nbsp;|&nbsp;
  Month : <span>${snapMonth}</span> &nbsp;|&nbsp;
  Total Records : <span>${records.length}</span>
</div>
<table><thead><tr>
  <th>Account No</th><th>Current Balance</th><th>Customer</th><th>Address</th>
  <th>Last Read Date</th><th>Finalized Date</th>
  <th>Meter No 1</th><th>Last Read 1</th>
  <th>Meter No 2</th><th>Last Read 2</th>
  <th>Meter No 3</th><th>Last Read 3</th>
  <th>Security Deposit</th>
</tr></thead>
<tbody>${rowsHtml}</tbody>
<tfoot><tr class="total-row">
  <td><b>TOTAL</b></td>
  <td style="text-align:right"><b>${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</b></td>
  <td colspan="10"></td>
  <td style="text-align:right"><b>${totalDeposit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</b></td>
</tr></tfoot>
</table></body></html>`;

    const w = window.open('', '_blank');
    if (!w) { setReportError('Popup blocked. Please allow popups to export PDF.'); return; }
    w.document.open(); w.document.write(html); w.document.close(); w.focus();
    setTimeout(() => { w.print(); setTimeout(() => w.close(), 500); }, 250);
  };

  const selectCls = 'w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent outline-none';

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">

      {!hasSearched && (
        <>
          <div className="mb-6">
            <h2 className={`text-xl font-bold ${maroon}`}>Finalized Accounts</h2>
          </div>

          <div className="space-y-4">

            {/* Province */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col">
                <label className={`text-xs font-medium mb-1 ${maroon}`}>
                  Province <span className="text-red-600">*</span>
                </label>
                {loadingDropdowns ? (
                  <div className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-gray-50 text-gray-500">Loading...</div>
                ) : (
                  <select value={province} onChange={e => { setProvince(e.target.value); setReportError(null); }} className={selectCls}>
                    <option value="">Select Province</option>
                    {provinces.map(p => (
                      <option key={p.ProvCode} value={p.ProvCode}>{p.ProvCode} – {p.ProvName}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Area */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col">
                <label className={`text-xs font-medium mb-1 ${!province ? 'text-gray-400' : maroon}`}>Area</label>
                {!province ? (
                  <div className="w-full px-2 py-1.5 text-xs border rounded-md bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed">
                    Select a province first
                  </div>
                ) : loadingAreas ? (
                  <div className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-gray-50 text-gray-500">Loading areas...</div>
                ) : (
                  <select value={area} onChange={e => setArea(e.target.value)} className={selectCls}>
                    <option value="">All Areas</option>
                    {areas.map(a => (
                      <option key={a.AreaCode} value={a.AreaCode}>{a.AreaCode} – {a.AreaName}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Month */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col">
                <label className={`text-xs font-medium mb-1 ${maroon}`}>Month</label>
                <select value={month} onChange={e => setMonth(e.target.value)} className={selectCls}>
                  <option value="*** - All Months">*** – All Months</option>
                  {billCycles.map(c => (
                    <option key={c} value={c}>
                      {isNaN(Number(c)) ? c : billCycleToLabel(Number(c))}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Balance filter */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={balanceChecked} onChange={e => setBalanceChecked(e.target.checked)} className="cursor-pointer" />
                  <label className={`text-xs font-medium ${maroon}`}>Balance</label>
                </div>
                <div className="flex gap-2">
                  <select value={balanceOperator} onChange={e => setBalanceOperator(e.target.value)} disabled={!balanceChecked}
                    className={`w-16 px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] outline-none ${!balanceChecked ? 'bg-gray-100 text-gray-400' : ''}`}>
                    <option value=">">&gt;</option>
                    <option value="<">&lt;</option>
                    <option value="=">=</option>
                    <option value=">=">&gt;=</option>
                    <option value="<=">&lt;=</option>
                  </select>
                  <input type="number" value={balanceValue} onChange={e => setBalanceValue(e.target.value)} disabled={!balanceChecked}
                    className={`flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] outline-none ${!balanceChecked ? 'bg-gray-100 text-gray-400' : ''}`} />
                </div>
              </div>
            </div>

            {/* Days filter */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={daysChecked} onChange={e => setDaysChecked(e.target.checked)} className="cursor-pointer" />
                  <label className={`text-xs font-medium ${maroon}`}>No. of Days</label>
                </div>
                <div className="flex gap-2">
                  <select value={daysOperator} onChange={e => setDaysOperator(e.target.value)} disabled={!daysChecked}
                    className={`w-16 px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] outline-none ${!daysChecked ? 'bg-gray-100 text-gray-400' : ''}`}>
                    <option value=">">&gt;</option>
                    <option value="<">&lt;</option>
                    <option value="=">=</option>
                    <option value=">=">&gt;=</option>
                    <option value="<=">&lt;=</option>
                  </select>
                  <input type="number" value={daysValue} onChange={e => setDaysValue(e.target.value)} disabled={!daysChecked}
                    className={`flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] outline-none ${!daysChecked ? 'bg-gray-100 text-gray-400' : ''}`} />
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="w-full mt-6 flex justify-end">
              <button onClick={fetchReport} disabled={loadingReport || !province}
                className={`px-6 py-2 rounded-md font-medium transition-opacity duration-300 shadow ${maroonGrad} text-white ${loadingReport || !province ? 'opacity-70 cursor-not-allowed' : 'hover:opacity-90'}`}>
                {loadingReport ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Loading...
                  </span>
                ) : 'Generate Report'}
              </button>
            </div>
          </div>

          {reportError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">{reportError}</div>
          )}
        </>
      )}

      {hasSearched && (
        <div className="mt-2">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
            <div>
              <h2 className={`text-xl font-bold ${maroon}`}>Finalized Accounts</h2>
              <p className="text-sm text-gray-600 mt-1">
                Province: <strong>{snapProvName}</strong>
                {' '}&nbsp;|&nbsp; Area: <strong>{snapAreaName}</strong>
                {' '}&nbsp;|&nbsp; Month: <strong>{snapMonth}</strong>
              </p>
            </div>
            <div className="flex space-x-2 mt-2 md:mt-0">
              <button onClick={handleExportCsv} disabled={!records.length}
                className={`flex items-center gap-1 px-3 py-1.5 border border-blue-400 rounded-md text-xs font-medium shadow-sm focus:outline-none transition ${!records.length ? 'text-blue-300 bg-gray-50 cursor-not-allowed' : 'text-blue-700 bg-white hover:bg-blue-50'}`}>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5l2 2h5a2 2 0 012 2v12a2 2 0 01-2 2z" />
                </svg>
                CSV
              </button>
              <button onClick={handleExportPdf} disabled={!records.length}
                className={`flex items-center gap-1 px-3 py-1.5 border border-green-400 rounded-md text-xs font-medium shadow-sm focus:outline-none transition ${!records.length ? 'text-green-300 bg-gray-50 cursor-not-allowed' : 'text-green-700 bg-white hover:bg-green-50'}`}>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                PDF
              </button>
              <button onClick={handleBackToForm} className="px-4 py-1.5 bg-[#7A0000] hover:bg-[#A52A2A] text-xs rounded-md text-white">
                Back to Form
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[calc(100vh-250px)] border border-gray-300 rounded-lg">
            <div className="min-w-full py-4">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-[#b0e0e8] text-gray-800 sticky top-0">
                    <th className="border border-gray-300 px-3 py-2 text-left font-bold whitespace-nowrap">Account No</th>
                    <th className="border border-gray-300 px-3 py-2 text-right font-bold whitespace-nowrap">Current Balance</th>
                    <th className="border border-gray-300 px-3 py-2 text-left font-bold whitespace-nowrap">Customer</th>
                    <th className="border border-gray-300 px-3 py-2 text-left font-bold whitespace-nowrap min-w-[180px]">Address</th>
                    <th className="border border-gray-300 px-3 py-2 text-left font-bold whitespace-nowrap">Last Read Date</th>
                    <th className="border border-gray-300 px-3 py-2 text-left font-bold whitespace-nowrap">Finalized Date</th>
                    <th className="border border-gray-300 px-3 py-2 text-left font-bold whitespace-nowrap">Meter No (1)</th>
                    <th className="border border-gray-300 px-3 py-2 text-left font-bold whitespace-nowrap">Last Read (1)</th>
                    <th className="border border-gray-300 px-3 py-2 text-left font-bold whitespace-nowrap">Meter No (2)</th>
                    <th className="border border-gray-300 px-3 py-2 text-left font-bold whitespace-nowrap">Last Read (2)</th>
                    <th className="border border-gray-300 px-3 py-2 text-left font-bold whitespace-nowrap">Meter No (3)</th>
                    <th className="border border-gray-300 px-3 py-2 text-left font-bold whitespace-nowrap">Last Read (3)</th>
                    <th className="border border-gray-300 px-3 py-2 text-right font-bold whitespace-nowrap">Security Deposit</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => (
                    <tr key={`${r.AccountNumber}-${i}`} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-300 px-3 py-1 font-mono whitespace-nowrap">{r.AccountNumber}</td>
                      <td className="border border-gray-300 px-3 py-1 font-mono text-right whitespace-nowrap">{Number(r.CurrentBalance).toFixed(2)}</td>
                      <td className="border border-gray-300 px-3 py-1">{r.CustomerName}</td>
                      <td className="border border-gray-300 px-3 py-1 min-w-[180px]">{r.Address}</td>
                      <td className="border border-gray-300 px-3 py-1 font-mono whitespace-nowrap">{r.LastReadDate}</td>
                      <td className="border border-gray-300 px-3 py-1 font-mono whitespace-nowrap">{r.FinalizedDate}</td>
                      <td className="border border-gray-300 px-3 py-1 font-mono whitespace-nowrap">{r.MeterNo1}</td>
                      <td className="border border-gray-300 px-3 py-1 font-mono whitespace-nowrap">{r.LastRead1}</td>
                      <td className="border border-gray-300 px-3 py-1 font-mono whitespace-nowrap">{r.MeterNo2}</td>
                      <td className="border border-gray-300 px-3 py-1 font-mono whitespace-nowrap">{r.LastRead2}</td>
                      <td className="border border-gray-300 px-3 py-1 font-mono whitespace-nowrap">{r.MeterNo3}</td>
                      <td className="border border-gray-300 px-3 py-1 font-mono whitespace-nowrap">{r.LastRead3}</td>
                      <td className="border border-gray-300 px-3 py-1 font-mono text-right whitespace-nowrap">{Number(r.SecurityDeposit).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[#d3d3d3] font-bold sticky bottom-0">
                    <td className="border border-gray-300 px-3 py-2 font-bold">TOTAL</td>
                    <td className="border border-gray-300 px-3 py-2 text-right font-mono font-bold">
                      {totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td colSpan={10} className="border border-gray-300 px-3 py-2"></td>
                    <td className="border border-gray-300 px-3 py-2 text-right font-mono font-bold">
                      {totalDeposit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
              {records.length > 0 && (
                <p className="text-xs text-gray-500 mt-2 text-right px-2">
                  Total records: {records.length.toLocaleString()}
                </p>
              )}
            </div>
          </div>

          {reportError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">{reportError}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default FinalizedAccounts;