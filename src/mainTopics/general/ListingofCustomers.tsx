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
    fetch("/misapi/api/bulk/areas", { headers: { Accept: "application/json" } })
      .then(r => r.json())
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
          `/misapi/api/listing-of-customers/max-bill-cycle?areaCode=${areaCode}`,
          `/misapi/api/areas-position/max-bill-cycle?areaCode=${areaCode}`,
        ]) {
          try {
            const r = await fetch(url, { headers: { Accept: "application/json" } });
            // A 404 response still parses as JSON on this server (IIS returns
            // {"Message":"No HTTP resource…"}), so we check status first.
            if (!r.ok) { console.warn(`[LOC] ${url} → ${r.status}`); continue; }
            const j = await r.json();
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
            `misapi/api/listing-of-customers/filters?areaCode=${areaCode}&billCycle=${resolvedBc}`,
            { headers: { Accept: "application/json" } }
          );

          if (fRes.ok) {
            const fJson = await fRes.json();
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
    try {
      const res = await fetch("misapi/api/listing-of-customers/report", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          areaCode,
          billCycle,
          useTariff,
          tariff:              useTariff  ? tariff  : null,
          useTransformer:      useTrans,
          transformer:         useTrans   ? trans   : null,
          usePhase,
          phase:               usePhase   ? phase   : null,
          useConnectionType:   useConn,
          connectionType:      useConn    ? conn    : null,
          useReaderCode:       useReader,
          readerCode:          useReader  ? reader  : null,
          useDailyPack:        usePack,
          dailyPackNo:         usePack    ? pack    : null,
          useDepot,
          depot:               useDepot   ? depot   : null,
          useBalance:          useBal,
          balanceOperator:     useBal     ? balOp   : null,
          balanceAmount:       useBal     ? balAmt  : null,
          useLastPaymentDate:  usePay,
          lastPaymentOperator: usePay     ? payOp   : null,
          lastPaymentDate:     usePay     ? payDate : null,
          useArrearsPosition:  useArr,
          arrearsOperator:     useArr     ? arrOp   : null,
          arrearsPosition:     useArr     ? arrPos  : null,
        }),
      });
      const data = await res.json();
      if (data.data && Array.isArray(data.data) && data.data.length > 0) {
        setReportData(data.data);
        setSelectedAreaName(areas.find(a => a.AreaCode === areaCode)?.AreaName ?? areaCode);
        setReportVisible(true);
      } else {
        setReportError(data.errorMessage || "No data found for the selected criteria.");
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
          className={[
            "text-xs border rounded-sm px-1.5 py-[3px] focus:outline-none w-52",
            disabled
              ? "bg-[#3c3c50] border-[#555570] text-gray-500 cursor-not-allowed"
              : "bg-white border-gray-400 text-gray-900",
          ].join(" ")}
        />
      );
    }
    return (
      <div className="relative inline-block">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          className={[
            "appearance-none text-xs border rounded-sm px-1.5 py-[3px] pr-5 focus:outline-none w-52",
            disabled
              ? "bg-[#3c3c50] border-[#555570] text-gray-500 cursor-not-allowed"
              : "bg-white border-gray-400 text-gray-900",
          ].join(" ")}
        >
          <option value=""></option>
          {opts.map((o, idx) => (
            <option key={`${o.Value}-${idx}`} value={o.Value}>{o.Label}</option>
          ))}
        </select>
        <span className={[
          "pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-[9px]",
          disabled ? "text-gray-600" : "text-gray-500",
        ].join(" ")}>▼</span>
      </div>
    );
  };

  const OpSel = ({
    val, set, on,
  }: { val: Operator; set: (v: Operator) => void; on: boolean }) => (
    <div className="relative inline-block">
      <select
        value={val}
        onChange={e => set(e.target.value as Operator)}
        disabled={!on}
        className={[
          "appearance-none text-xs border rounded-sm px-1 py-[3px] pr-4 w-14 focus:outline-none",
          on
            ? "bg-white border-gray-400 text-gray-900"
            : "bg-[#3c3c50] border-[#555570] text-gray-500 cursor-not-allowed",
        ].join(" ")}
      >
        {(["=", ">", "<", ">=", "<="] as Operator[]).map(o => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      <span className={[
        "pointer-events-none absolute right-0.5 top-1/2 -translate-y-1/2 text-[9px]",
        on ? "text-gray-500" : "text-gray-600",
      ].join(" ")}>▼</span>
    </div>
  );

  const Row = ({
    label, checked, onCheck, children, checkboxDisabled,
  }: {
    label: string; checked: boolean;
    onCheck: (v: boolean) => void; children: React.ReactNode; checkboxDisabled?: boolean;
  }) => (
    <div
      className="grid items-center"
      style={{ gridTemplateColumns: "230px 1fr", padding: "4px 0", borderBottom: "1px solid #3a3a52" }}
    >
      <label className="flex items-center gap-2 cursor-pointer select-none"
        style={{ opacity: checkboxDisabled ? 0.5 : 1 }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={e => onCheck(e.target.checked)}
          disabled={checkboxDisabled}
          style={{ width: 13, height: 13, accentColor: "#7a9ccc", cursor: checkboxDisabled ? "not-allowed" : "pointer" }}
        />
        <span style={{ color: "#d0d0e0", fontSize: 13 }}>{label}</span>
      </label>
      <div className="flex items-center gap-1.5">{children}</div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-200 flex items-start justify-center p-8">

      {/* ══════════════════════════ FORM ══════════════════════════════════════ */}
      {!reportVisible && (
        <div style={{
          background: "#2b2b3d",
          border: "2px solid #4a4a6a",
          borderRadius: 4,
          padding: "16px 20px 20px",
          width: 580,
        }}>
          <form onSubmit={handleSubmit}>

            {/* Select Area */}
            <div
              className="grid items-center"
              style={{ gridTemplateColumns: "230px 1fr", paddingBottom: 8, marginBottom: 4 }}
            >
              <span style={{ color: "#d0d0e0", fontSize: 13 }}>Select Area</span>
              <div className="relative inline-block">
                {isLoadingAreas ? (
                  <span style={{ color: "#aaa", fontSize: 12 }}>Loading…</span>
                ) : areaError ? (
                  <span style={{ color: "#f88", fontSize: 12 }}>{areaError}</span>
                ) : (
                  <>
                    <select
                      value={areaCode}
                      onChange={e => { setAreaCode(e.target.value); setReportError(null); }}
                      required
                      className="appearance-none text-xs border rounded-sm px-1.5 py-[3px] pr-5 w-52 focus:outline-none bg-white border-gray-400 text-gray-900"
                    >
                      <option value="">Select Area</option>
                      {areas.map(a => (
                        <option key={a.AreaCode} value={a.AreaCode}>{a.AreaName}</option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-gray-500">▼</span>
                  </>
                )}
              </div>
            </div>

            {/* Status messages below area */}
            {isLoadingFilters && (
              <p style={{ color: "#7ab", fontSize: 11, marginBottom: 4, paddingLeft: 230 }}>
                Loading filter options…
              </p>
            )}
            {filterError && !isLoadingFilters && (
              <p style={{ color: "#f99", fontSize: 11, marginBottom: 4, paddingLeft: 230 }}>
                {filterError}
              </p>
            )}
            {ready && (
              <p style={{ color: "#8c8", fontSize: 11, marginBottom: 4, paddingLeft: 230 }}>
                Bill Cycle: {billCycle}
              </p>
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
                  style={{ width: 140 }}
                  className={[
                    "text-xs border rounded-sm px-1.5 py-[3px] focus:outline-none",
                    ready
                      ? "bg-white border-gray-400 text-gray-900"
                      : "bg-[#3c3c50] border-[#555570] text-gray-500 cursor-not-allowed",
                  ].join(" ")}
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
                  className={[
                    "text-xs border rounded-sm px-1.5 py-[3px] focus:outline-none w-40",
                    ready
                      ? "bg-white border-gray-400 text-gray-900"
                      : "bg-[#3c3c50] border-[#555570] text-gray-500 cursor-not-allowed",
                  ].join(" ")}
                />
              </Row>

              {/* Arrears Position */}
              <Row label="Arrears Position"
                checked={useArr}
                onCheck={v => { setUseArr(v); if (!v) { setArrPos("1"); setArrOp(">="); } }}
                checkboxDisabled={arrPos === "1"}>
                <OpSel val={arrOp} set={setArrOp} on={ready} />
                <div className="relative inline-block">
                  <select
                    value={arrPos}
                    onChange={e => setArrPos(e.target.value)}
                    disabled={!ready}
                    className={[
                      "appearance-none text-xs border rounded-sm px-1.5 py-[3px] pr-4 w-14 focus:outline-none",
                      ready
                        ? "bg-white border-gray-400 text-gray-900"
                        : "bg-[#3c3c50] border-[#555570] text-gray-500 cursor-not-allowed",
                    ].join(" ")}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                      <option key={n} value={String(n)}>{n}</option>
                    ))}
                  </select>
                  <span className={[
                    "pointer-events-none absolute right-0.5 top-1/2 -translate-y-1/2 text-[9px]",
                    ready ? "text-gray-500" : "text-gray-600",
                  ].join(" ")}>▼</span>
                </div>
              </Row>

            </div>{/* end filter rows */}

            {/* Submit error */}
            {reportError && (
              <p style={{ color: "#f99", fontSize: 11, marginTop: 8, textAlign: "center" }}>
                {reportError}
              </p>
            )}

            {/* View Report button */}
            <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
              <button
                type="submit"
                disabled={loading || !areaCode || !billCycle || isLoadingFilters}
                style={{
                  padding: "3px 18px",
                  fontSize: 13,
                  border: "1px solid #888",
                  borderRadius: 2,
                  cursor: loading || !areaCode || !billCycle || isLoadingFilters
                    ? "not-allowed" : "pointer",
                  background: loading || !areaCode || !billCycle || isLoadingFilters
                    ? "#555" : "#d4d0c8",
                  color: loading || !areaCode || !billCycle || isLoadingFilters
                    ? "#999" : "#111",
                }}
              >
                {loading ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <svg style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }}
                      xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                      <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10"
                        stroke="currentColor" strokeWidth="4" />
                      <path style={{ opacity: 0.75 }} fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Loading…
                  </span>
                ) : "View Report"}
              </button>
            </div>

          </form>
        </div>
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
                <p className="text-xs text-gray-400 mt-2 text-right pr-2">
                  Total records: {reportData.length.toLocaleString()}
                </p>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default ListingOfCustomers;