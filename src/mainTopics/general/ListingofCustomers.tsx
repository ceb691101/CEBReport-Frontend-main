import React, { useState, useEffect, useRef } from "react";
import { FaFileDownload, FaPrint } from "react-icons/fa";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface Area {
  AreaCode: string;
  AreaName: string;
}

interface FilterOption {
  Value: string;
  Label: string;
}

interface FiltersData {
  // API may return PascalCase or camelCase — we handle both
  BillCycle?: string;            billCycle?: string;
  Tariffs?: FilterOption[];      tariffs?: FilterOption[];
  Transformers?: FilterOption[]; transformers?: FilterOption[];
  Phases?: FilterOption[];       phases?: FilterOption[];
  ConnectionTypes?: FilterOption[]; connectionTypes?: FilterOption[];
  ReaderCodes?: FilterOption[];  readerCodes?: FilterOption[];
  DailyPacks?: FilterOption[];   dailyPacks?: FilterOption[];
  Depots?: FilterOption[];       depots?: FilterOption[];
  ErrorMessage?: string;         errorMessage?: string;
}

interface CustomerRecord {
  AccountNumber: string;
  MeterNumbers: string;
  CustomerName: string;
  Address: string;
  Tariff: string;
  CurrentDepot: string;
  Transformer: string;
  ReaderCode: string;
  KwhCharge: string;
  CurrentBalance: string;
  RawKwhCharge: number;
  RawCurrentBalance: number;
  NoOfPhase: string;
  ConnectionType: string;
  DailyPackNo: string;
  WalkSeq: string;
  KvaRating: string;
  AreaCode: string;
  AreaName: string;
  BillCycle: string;
  ErrorMessage: string;
}

type Operator = "=" | ">" | "<" | ">=" | "<=";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const fmt = (n: number, d = 2) =>
  n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

// Accept PascalCase or camelCase from API
const pick = <T,>(a: T | undefined, b: T | undefined, fb: T): T => a ?? b ?? fb;

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
const ListingOfCustomers: React.FC = () => {

  const maroon = "text-[#7A0000]";
  const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

  // ── Core state ─────────────────────────────────────────────────────────────
  const [areaCode,  setAreaCode]  = useState("");
  const [billCycle, setBillCycle] = useState("");
  const [loading,   setLoading]   = useState(false);

  // ── Data ───────────────────────────────────────────────────────────────────
  const [areas,   setAreas]   = useState<Area[]>([]);
  const [filters, setFilters] = useState<FiltersData | null>(null);

  // ── Loading flags ──────────────────────────────────────────────────────────
  const [isLoadingAreas,   setIsLoadingAreas]   = useState(false);
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);
  // filtersLoaded is set to true ONLY after the /filters API call succeeds.
  // We use this (not !!billCycle) as the ready-gate because React setState
  // is async — billCycle may still be "" on the render cycle right after
  // setBillCycle(bc) is called inside the async function.
  const [filtersLoaded, setFiltersLoaded] = useState(false);

  // ── Error state ────────────────────────────────────────────────────────────
  const [areaError,   setAreaError]   = useState<string | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  // ── Report state ───────────────────────────────────────────────────────────
  const [reportData,       setReportData]       = useState<CustomerRecord[]>([]);
  const [reportVisible,    setReportVisible]    = useState(false);
  const [selectedAreaName, setSelectedAreaName] = useState("");

  // ── Filter field state ─────────────────────────────────────────────────────
  const [useTariff,  setUseTariff]  = useState(false); const [tariff,  setTariff]  = useState("");
  const [useTrans,   setUseTrans]   = useState(false); const [trans,   setTrans]   = useState("");
  const [usePhase,   setUsePhase]   = useState(false); const [phase,   setPhase]   = useState("");
  const [useConn,    setUseConn]    = useState(false); const [conn,    setConn]    = useState("");
  const [useReader,  setUseReader]  = useState(false); const [reader,  setReader]  = useState("");
  const [usePack,    setUsePack]    = useState(false); const [pack,    setPack]    = useState("");
  const [useDepot,   setUseDepot]   = useState(false); const [depot,   setDepot]   = useState("");

  const [useBal,  setUseBal]  = useState(false);
  const [balOp,   setBalOp]   = useState<Operator>("=");
  const [balAmt,  setBalAmt]  = useState("");

  const [usePay,  setUsePay]  = useState(false);
  const [payOp,   setPayOp]   = useState<Operator>("=");
  const [payDate, setPayDate] = useState("");

  const [useArr,  setUseArr]  = useState(false);
  const [arrOp,   setArrOp]   = useState<Operator>(">=");
  const [arrPos,  setArrPos]  = useState("1");

  const printRef = useRef<HTMLDivElement>(null);

  // ── 1. Load areas on mount ─────────────────────────────────────────────────
  useEffect(() => {
    setIsLoadingAreas(true);
    setAreaError(null);
    fetch("/api/bulk/areas", { headers: { Accept: "application/json" } })
      .then(async r => {
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        }
        try {
          return await r.json();
        } catch (e) {
          throw new Error("Invalid JSON response from areas API");
        }
      })
      .then(d => setAreas(d.data || []))
      .catch(e => setAreaError(e.message))
      .finally(() => setIsLoadingAreas(false));
  }, []);

  // ── 2. When area changes → get bill cycle → get filters ───────────────────
  useEffect(() => {
    // Reset everything when area is cleared
    if (!areaCode) {
      setBillCycle("");
      setFilters(null);
      setFiltersLoaded(false);
      resetFilters();
      setFilterError(null);
      setReportError(null);
      return;
    }

    let cancelled = false;

    // Reset state for new area
    setIsLoadingFilters(true);
    setFiltersLoaded(false);
    setBillCycle("");
    setFilters(null);
    resetFilters();
    setFilterError(null);
    setReportError(null);

    // ── Helper: pull billCycle string out of any response shape ────────────
    const extractBc = (json: any): string => {
      const n = json?.data ?? json?.Data ?? json ?? null;
      return String(
        n?.billCycle ?? n?.BillCycle ?? n?.bill_cycle ??
        n?.MaxBillCycle ?? n?.maxBillCycle ?? ""
      ).trim();
    };

    const run = async () => {
      try {
        // ── Step 1: resolve max bill cycle ──────────────────────────────────
        // The listing-of-customers/max-bill-cycle endpoint may not be deployed
        // yet (404). We try it first, then fall back to areas-position which
        // uses the same ordinary DB connection and is confirmed live.
        let resolvedBc = "";

        for (const url of [
          `/api/listing-of-customers/max-bill-cycle?areaCode=${areaCode}`,
          `/api/areas-position/max-bill-cycle?areaCode=${areaCode}`,
        ]) {
          try {
            const r = await fetch(url, { headers: { Accept: "application/json" } });
            // A 404 response still parses as JSON on this server (IIS returns
            // {"Message":"No HTTP resource…"}), so we check status first.
            if (!r.ok) { console.warn(`[LOC] ${url} → ${r.status}`); continue; }
            let j;
            try {
              j = await r.json();
            } catch (e) {
              console.warn(`[LOC] ${url} → Invalid JSON response:`, e);
              continue;
            }
            console.log(`[LOC] bill-cycle from ${url}:`, JSON.stringify(j));
            resolvedBc = extractBc(j);
            if (resolvedBc) break;
          } catch (e) {
            console.warn(`[LOC] fetch error for ${url}:`, e);
          }
        }

        console.log("[LOC] resolved bill cycle:", resolvedBc);

        if (!resolvedBc) {
          if (!cancelled) setFilterError("No bill cycle found for this area.");
          return;
        }

        if (!cancelled) setBillCycle(resolvedBc);

        // ── Step 2: try to load filter dropdowns (may also be 404) ──────────
        // If the endpoint is not yet deployed we still unlock the UI so the
        // user can run the report without pre-filled dropdowns — the filter
        // inputs fall back to free-text when no options are available.
        try {
          const fRes = await fetch(
            `/api/listing-of-customers/filters?areaCode=${areaCode}&billCycle=${resolvedBc}`,
            { headers: { Accept: "application/json" } }
          );

          if (fRes.ok) {
            let fJson;
            try {
              fJson = await fRes.json();
            } catch (e) {
              console.warn("[LOC] filters endpoint returned invalid JSON:", e);
              // Continue without filters - UI will work with empty dropdowns
            }
            if (fJson) {
              console.log("[LOC] filters response:", JSON.stringify(fJson));
              const fData = fJson?.data ?? fJson?.Data ?? null;
              if (fData && !cancelled) {
                const norm: FiltersData = {
                  billCycle:       fData.BillCycle       ?? fData.billCycle,
                  tariffs:         fData.Tariffs         ?? fData.tariffs         ?? [],
                  transformers:    fData.Transformers    ?? fData.transformers    ?? [],
                  phases:          fData.Phases          ?? fData.phases          ?? [],
                  connectionTypes: fData.ConnectionTypes ?? fData.connectionTypes ?? [],
                  readerCodes:     fData.ReaderCodes     ?? fData.readerCodes     ?? [],
                  dailyPacks:      fData.DailyPacks      ?? fData.dailyPacks      ?? [],
                  depots:          fData.Depots          ?? fData.depots          ?? [],
                };
                setFilters(norm);
              }
            }
          } else {
            console.warn(`[LOC] filters endpoint → ${fRes.status}, continuing without options`);
          }
        } catch (e) {
          console.warn("[LOC] filters fetch error, continuing without options:", e);
        }

        // Unlock the UI regardless of whether filter options loaded — the
        // dropdowns degrade to free-text inputs when opts is empty.
        if (!cancelled) {
          setFiltersLoaded(true);
          setFilterError(null);
        }

      } catch (err: any) {
        console.error("[LOC] error:", err);
        if (!cancelled) setFilterError(err.message ?? "Error loading data for this area.");
      } finally {
        if (!cancelled) setIsLoadingFilters(false);
      }
    };

    run();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaCode]);

  // ── Reset all filter checkboxes and values ─────────────────────────────────
  const resetFilters = () => {
    setUseTariff(false); setTariff("");
    setUseTrans(false);  setTrans("");
    setUsePhase(false);  setPhase("");
    setUseConn(false);   setConn("");
    setUseReader(false); setReader("");
    setUsePack(false);   setPack("");
    setUseDepot(false);  setDepot("");
    setUseBal(false);    setBalAmt(""); setBalOp("=");
    setUsePay(false);    setPayDate(""); setPayOp("=");
    setUseArr(false);    setArrPos("1"); setArrOp(">=");
  };

  // ── Totals ─────────────────────────────────────────────────────────────────
  const totalKwh = reportData.reduce((s, r) => s + r.RawKwhCharge, 0);
  const totalBal = reportData.reduce((s, r) => s + r.RawCurrentBalance, 0);

  // ── Submit report ──────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!areaCode || !billCycle) return;
    setLoading(true);
    setReportError(null);

    const payload: Record<string, unknown> = {
      areaCode,
      billCycle,
      useTariff,
      useTransformer: useTrans,
      usePhase,
      useConnectionType: useConn,
      useReaderCode: useReader,
      useDailyPack: usePack,
      useDepot,
      useBalance: useBal,
      useLastPaymentDate: usePay,
      useArrearsPosition: useArr,
    };

    if (useTariff && tariff) payload.tariff = tariff;
    if (useTrans && trans) payload.transformer = trans;
    if (usePhase && phase) payload.phase = phase;
    if (useConn && conn) payload.connectionType = conn;
    if (useReader && reader) payload.readerCode = reader;
    if (usePack && pack) payload.dailyPackNo = pack;
    if (useDepot && depot) payload.depot = depot;
    if (useBal && balAmt) {
      payload.balanceOperator = balOp;
      payload.balanceAmount = balAmt;
    }
    if (usePay && payDate) {
      payload.lastPaymentOperator = payOp;
      payload.lastPaymentDate = payDate;
    }
    if (useArr && arrPos) {
      payload.arrearsOperator = arrOp;
      payload.arrearsPosition = arrPos;
    }

    try {
      const url = "/api/listing-of-customers/report";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch (e) {
        console.warn("[LOC] report API returned non-JSON text:", text);
      }

      if (!res.ok) {
        const errorMessage = data?.errorMessage || data?.Message || text || `${res.status} ${res.statusText}`;
        throw new Error(errorMessage);
      }

      if (data?.data && Array.isArray(data.data)) {
        setReportData(data.data);
        setSelectedAreaName(areas.find(a => a.AreaCode === areaCode)?.AreaName ?? areaCode);
        setReportVisible(true);
        if (data.data.length === 0) {
          setReportError("No records found for the selected criteria.");
        }
      } else {
        setReportError(data?.errorMessage || "Cannot get listing of customers report data.");
      }
    } catch (err: any) {
      setReportError(err.message || "Failed to generate report.");
    } finally {
      setLoading(false);
    }
  };

  // ── CSV export ─────────────────────────────────────────────────────────────
  const downloadCSV = () => {
    const headers = ["Acct. Number","Meter Numbers","Customer Name","Address","Tariff",
      "Current Depot","Transformer","Reader Code","KWh Charge","Current Balance",
      "No. of Phase","Connection Type","Daily Pack No.","Walk Seq","KVA Rating"];
    const rows = reportData.map(r => [
      r.AccountNumber, r.MeterNumbers, r.CustomerName, r.Address, r.Tariff,
      r.CurrentDepot, r.Transformer, r.ReaderCode, r.KwhCharge, r.CurrentBalance,
      r.NoOfPhase, r.ConnectionType, r.DailyPackNo, r.WalkSeq, r.KvaRating,
    ]);
    const totals = ["TOTAL","","","","","","","",fmt(totalKwh),fmt(totalBal),"","","","",""];
    const csv = [
      [`Listing of Customers`],
      [`Area: ${selectedAreaName}`, `Bill Cycle: ${billCycle}`],
      [], headers, ...rows, totals,
    ].map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    a.download = `ListingOfCustomers_${billCycle}_${areaCode}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  // ── PDF print ──────────────────────────────────────────────────────────────
  const printPDF = () => {
    if (!printRef.current) return;
    const w = window.open("", "_blank"); if (!w) return;
    w.document.write(`<html><head><title>Listing of Customers</title>
      <style>
        body { font-family: Arial; font-size: 9px; margin: 10mm; }
        h2   { color: #7A0000; font-size: 12px; }
        .m   { font-size: 10px; margin-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #b0e0e8; padding: 4px 3px; border: 1px solid #aaa; text-align: center; }
        td { padding: 2px 3px; border: 1px solid #ccc; }
        tr:nth-child(even) { background: #f5f5f5; }
        .t td { background: #d3d3d3; font-weight: bold; }
        .r { text-align: right; } .c { text-align: center; }
      </style></head><body>
      <h2>Listing of Customers</h2>
      <div class="m">Area: <b>${selectedAreaName}</b> &nbsp;|&nbsp; Bill Cycle: <b>${billCycle}</b></div>
      ${printRef.current.innerHTML}
    </body></html>`);
    w.document.close(); w.focus();
    setTimeout(() => { w.print(); w.close(); }, 400);
  };

  // ── Resolved option lists — handle PascalCase or camelCase ────────────────
  const oTariff  = pick(filters?.Tariffs,         filters?.tariffs,         []);
  const oTrans   = pick(filters?.Transformers,    filters?.transformers,    []);
  const oPhase   = pick(filters?.Phases,          filters?.phases,          []);
  const oConn    = pick(filters?.ConnectionTypes, filters?.connectionTypes, []);
  const oReader  = pick(filters?.ReaderCodes,     filters?.readerCodes,     []);
  const oPack    = pick(filters?.DailyPacks,      filters?.dailyPacks,      []);
  const oDepot   = pick(filters?.Depots,          filters?.depots,          []);

  // ── ready: true only after filters API call succeeded ─────────────────────
  // Do NOT use !!billCycle here — setState is async, billCycle may be ""
  // on the render cycle immediately after setBillCycle(bc) is called.
  const ready = filtersLoaded && !isLoadingFilters;

  // ── Sub-components ─────────────────────────────────────────────────────────

  const DarkSelect = ({
    value, onChange, disabled, opts,
  }: {
    value: string; onChange: (v: string) => void;
    disabled: boolean; opts: FilterOption[];
  }) => {
    // If the filters endpoint hasn't loaded any options yet, fall back to a
    // free-text input so the user can still type a value manually.
    if (opts.length === 0) {
      return (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          placeholder={disabled ? "" : "type value…"}
          className="w-52 px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent"
        />
      );
    }
    return (
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="w-52 px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent"
      >
        <option value=""></option>
        {opts.map((o, idx) => (
          <option key={`${o.Value}-${idx}`} value={o.Value}>{o.Label}</option>
        ))}
      </select>
    );
  };

  const OpSel = ({
    val, set, on,
  }: { val: Operator; set: (v: Operator) => void; on: boolean }) => (
    <select
      value={val}
      onChange={e => set(e.target.value as Operator)}
      disabled={!on}
      className="w-14 px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent"
    >
      {(["=", ">", "<", ">=", "<="] as Operator[]).map(o => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );

  const Row = ({
    label, checked, onCheck, children, checkboxDisabled,
  }: {
    label: string; checked: boolean;
    onCheck: (v: boolean) => void; children: React.ReactNode; checkboxDisabled?: boolean;
  }) => (
    <div className="flex items-center gap-4 p-2 border-b border-gray-200">
      <label className="flex items-center gap-2 cursor-pointer select-none flex-shrink-0 w-48">
        <input
          type="checkbox"
          checked={checked}
          onChange={e => onCheck(e.target.checked)}
          disabled={checkboxDisabled}
          className="w-4 h-4 text-[#7A0000] focus:ring-[#7A0000] border-gray-300 rounded"
        />
        <span className="text-xs text-gray-700">{label}</span>
      </label>
      <div className="flex items-center gap-2 flex-1">{children}</div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 bg-white rounded-lg shadow-md">

      {/* ══════════════════════════ FORM ══════════════════════════════════════ */}
      {!reportVisible && (
        <>
          <div className="mb-6">
            <h2 className={`text-xl font-bold ${maroon}`}>
              Listing of Customers
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Select Area */}
            <div className="flex flex-col">
              <label className={`text-xs font-medium mb-1 ${maroon}`}>
                Select Area: <span className="text-red-600">*</span>
              </label>
              {isLoadingAreas ? (
                <div className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-gray-50 text-gray-500">
                  Loading areas...
                </div>
              ) : areaError ? (
                <div className="w-full px-2 py-1.5 text-xs border border-red-300 rounded-md bg-red-50 text-red-600">
                  {areaError}
                </div>
              ) : (
                <select
                  value={areaCode}
                  onChange={e => { setAreaCode(e.target.value); setReportError(null); }}
                  required
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent"
                >
                  <option value="">Select Area</option>
                  {areas.map(a => (
                    <option key={a.AreaCode} value={a.AreaCode}>{a.AreaName}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Status messages below area */}
            {isLoadingFilters && (
              <div className="text-xs text-blue-600 mt-1">
                Loading filter options…
              </div>
            )}
            {filterError && !isLoadingFilters && (
              <div className="text-xs text-red-600 mt-1">
                {filterError}
              </div>
            )}
            {ready && (
              <div className="text-xs text-green-600 mt-1">
                Bill Cycle: {billCycle}
              </div>
            )}

            {/* Filter rows */}
            <div style={{ borderTop: "1px solid #3a3a52" }}>

              <Row label="Tariff"
                checked={useTariff}
                onCheck={v => { setUseTariff(v); if (!v) setTariff(""); }}
                checkboxDisabled={!tariff}>
                <DarkSelect value={tariff} onChange={setTariff}
                  disabled={!ready} opts={oTariff} />
              </Row>

              <Row label="Transformer"
                checked={useTrans}
                onCheck={v => { setUseTrans(v); if (!v) setTrans(""); }}
                checkboxDisabled={!trans}>
                <DarkSelect value={trans} onChange={setTrans}
                  disabled={!ready} opts={oTrans} />
              </Row>

              <Row label="Phase"
                checked={usePhase}
                onCheck={v => { setUsePhase(v); if (!v) setPhase(""); }}
                checkboxDisabled={!phase}>
                <DarkSelect value={phase} onChange={setPhase}
                  disabled={!ready} opts={oPhase} />
              </Row>

              <Row label="Connection Type"
                checked={useConn}
                onCheck={v => { setUseConn(v); if (!v) setConn(""); }}
                checkboxDisabled={!conn}>
                <DarkSelect value={conn} onChange={setConn}
                  disabled={!ready} opts={oConn} />
              </Row>

              <Row label="Reader"
                checked={useReader}
                onCheck={v => { setUseReader(v); if (!v) setReader(""); }}
                checkboxDisabled={!reader}>
                <DarkSelect value={reader} onChange={setReader}
                  disabled={!ready} opts={oReader} />
              </Row>

              <Row label="Daily Pack"
                checked={usePack}
                onCheck={v => { setUsePack(v); if (!v) setPack(""); }}
                checkboxDisabled={!pack}>
                <DarkSelect value={pack} onChange={setPack}
                  disabled={!ready} opts={oPack} />
              </Row>

              <Row label="Depot"
                checked={useDepot}
                onCheck={v => { setUseDepot(v); if (!v) setDepot(""); }}
                checkboxDisabled={!depot}>
                <DarkSelect value={depot} onChange={setDepot}
                  disabled={!ready} opts={oDepot} />
              </Row>

              {/* Balance */}
              <Row label="Balance"
                checked={useBal}
                onCheck={v => { setUseBal(v); if (!v) { setBalAmt(""); setBalOp("="); } }}
                checkboxDisabled={!balAmt}>
                <OpSel val={balOp} set={setBalOp} on={ready} />
                <input
                  type="number"
                  value={balAmt}
                  onChange={e => setBalAmt(e.target.value)}
                  disabled={!ready}
                  className="w-32 px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent"
                />
              </Row>

              {/* Last Payment Date */}
              <Row label="Last Payment Date"
                checked={usePay}
                onCheck={v => { setUsePay(v); if (!v) { setPayDate(""); setPayOp("="); } }}
                checkboxDisabled={!payDate}>
                <OpSel val={payOp} set={setPayOp} on={ready} />
                <input
                  type="date"
                  value={payDate}
                  onChange={e => setPayDate(e.target.value)}
                  disabled={!ready}
                  className="w-40 px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent"
                />
              </Row>

              {/* Arrears Position */}
              <Row label="Arrears Position"
                checked={useArr}
                onCheck={v => { setUseArr(v); if (!v) { setArrPos("1"); setArrOp(">="); } }}
                checkboxDisabled={arrPos === "1"}>
                <OpSel val={arrOp} set={setArrOp} on={ready} />
                <select
                  value={arrPos}
                  onChange={e => setArrPos(e.target.value)}
                  disabled={!ready}
                  className="w-14 px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7A0000] focus:border-transparent"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                    <option key={n} value={String(n)}>{n}</option>
                  ))}
                </select>
              </Row>

            </div>{/* end filter rows */}

            {/* Submit error */}
            {reportError && (
              <div className="text-xs text-red-600 mt-4">
                {reportError}
              </div>
            )}

            {/* View Report button */}
            <div className="w-full mt-6 flex justify-end">
              <button
                type="submit"
                disabled={loading || !areaCode || !billCycle || isLoadingFilters}
                className={`px-6 py-2 rounded-md font-medium transition-opacity duration-300 shadow
                  ${maroonGrad} text-white
                  ${loading || !areaCode || !billCycle || isLoadingFilters ? "opacity-70 cursor-not-allowed" : "hover:opacity-90"}`}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Loading...
                  </span>
                ) : "View Report"}
              </button>
            </div>

          </form>
        </>
      )}

      {/* ══════════════════════════ REPORT ════════════════════════════════════ */}
      {reportVisible && (
        <div className="w-full">

          {/* Header + action buttons */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
            <div>
              <h2 className="text-xl font-bold text-[#7A0000]">Listing of Customers</h2>
              <p className="text-sm text-gray-600 mt-1">
                Area: {selectedAreaName} &nbsp;|&nbsp; Bill Cycle: {billCycle}
              </p>
            </div>
            <div className="flex gap-2 mt-2 md:mt-0">
              <button onClick={downloadCSV}
                className="flex items-center gap-1 px-3 py-1.5 border border-blue-400 text-blue-700
                           bg-white rounded text-xs font-medium shadow-sm hover:bg-blue-50 transition">
                <FaFileDownload className="w-3 h-3" /> CSV
              </button>
              <button onClick={printPDF}
                className="flex items-center gap-1 px-3 py-1.5 border border-green-400 text-green-700
                           bg-white rounded text-xs font-medium shadow-sm hover:bg-green-50 transition">
                <FaPrint className="w-3 h-3" /> PDF
              </button>
              <button
                onClick={() => { setReportVisible(false); setReportError(null); }}
                className="px-4 py-1.5 bg-[#7A0000] hover:bg-[#A52A2A] text-xs rounded text-white">
                Back to Form
              </button>
            </div>
          </div>

          {/* Scrollable table */}
          <div className="overflow-x-auto max-h-[calc(100vh-220px)] border border-gray-300 rounded-lg bg-white">
            <div ref={printRef} className="min-w-full p-2">
              {reportData.length === 0 ? (
                <p className="text-center py-10 text-gray-500 text-sm">No records found.</p>
              ) : (
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#b0e0e8] text-gray-800">
                      {[
                        "Acct. Number", "Meter Numbers", "Customer Name", "Address",
                        "Tariff", "Current Depot", "Transformer", "Reader Code",
                        "KWh Charge", "Current Balance", "No. of Phase",
                        "Connection Type", "Daily Pack No.", "Walk Seq", "KVA Rating",
                      ].map(h => (
                        <th key={h}
                          className="border border-gray-300 px-2 py-2 text-center font-bold whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((r, i) => (
                      <tr key={`${r.AccountNumber}-${i}`}
                        className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="border border-gray-300 px-2 py-1 font-mono whitespace-nowrap">{r.AccountNumber}</td>
                        <td className="border border-gray-300 px-2 py-1 whitespace-nowrap">{r.MeterNumbers || "—"}</td>
                        <td className="border border-gray-300 px-2 py-1 max-w-[120px] truncate" title={r.CustomerName}>{r.CustomerName}</td>
                        <td className="border border-gray-300 px-2 py-1 max-w-[130px] truncate" title={r.Address}>{r.Address || "—"}</td>
                        <td className="border border-gray-300 px-2 py-1 text-center">{r.Tariff || "—"}</td>
                        <td className="border border-gray-300 px-2 py-1 text-center">{r.CurrentDepot || "—"}</td>
                        <td className="border border-gray-300 px-2 py-1 text-center">{r.Transformer || "—"}</td>
                        <td className="border border-gray-300 px-2 py-1 text-center">{r.ReaderCode || "—"}</td>
                        <td className="border border-gray-300 px-2 py-1 text-right font-mono">{r.KwhCharge || "—"}</td>
                        <td className="border border-gray-300 px-2 py-1 text-right font-mono">{r.CurrentBalance || "—"}</td>
                        <td className="border border-gray-300 px-2 py-1 text-center">{r.NoOfPhase || "—"}</td>
                        <td className="border border-gray-300 px-2 py-1 text-center">{r.ConnectionType || "—"}</td>
                        <td className="border border-gray-300 px-2 py-1 text-center">{r.DailyPackNo || "—"}</td>
                        <td className="border border-gray-300 px-2 py-1 text-center">{r.WalkSeq || "—"}</td>
                        <td className="border border-gray-300 px-2 py-1 text-center">{r.KvaRating || "—"}</td>
                      </tr>
                    ))}
                    <tr className="bg-[#d3d3d3] font-bold" key="total">
                      <td className="border border-gray-300 px-2 py-1 text-center font-bold" colSpan={8}>TOTAL</td>
                      <td className="border border-gray-300 px-2 py-1 text-right font-mono">{fmt(totalKwh)}</td>
                      <td className="border border-gray-300 px-2 py-1 text-right font-mono">{fmt(totalBal)}</td>
                      <td className="border border-gray-300 px-2 py-1" colSpan={5} />
                    </tr>
                  </tbody>
                </table>
              )}
              {reportData.length > 0 && (
                <p className="text-xs text-gray-500 mt-2 text-right px-2">
                  Total records: {reportData.length.toLocaleString()}
                </p>
              )}
            </div>
          </div>

          {reportError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {reportError}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ListingOfCustomers;