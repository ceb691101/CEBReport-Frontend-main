import { useEffect, useMemo, useState } from "react";

type DynamicReportByRepIdProps = {
  repIdNo: string;
  reportName: string;
};

type ApiResponse = unknown[] | Record<string, unknown> | null;

const endpointCandidates = (repIdNo: string) => [
  `/misapi/api/report/${encodeURIComponent(repIdNo)}`,
  `/misapi/api/reports/${encodeURIComponent(repIdNo)}`,
  `/misapi/api/reportdata/${encodeURIComponent(repIdNo)}`,
  `/misapi/api/report/get?repIdNo=${encodeURIComponent(repIdNo)}`,
  `/misreportsapi/api/report/${encodeURIComponent(repIdNo)}`,
  `/misreportsapi/api/report/get?repIdNo=${encodeURIComponent(repIdNo)}`,
];

const toRows = (value: ApiResponse): Array<Record<string, unknown>> => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter((item) => item && typeof item === "object") as Array<Record<string, unknown>>;
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;

    if (Array.isArray(obj.data)) {
      return obj.data.filter((item) => item && typeof item === "object") as Array<Record<string, unknown>>;
    }

    if (obj.data && typeof obj.data === "object") {
      return [obj.data as Record<string, unknown>];
    }

    return [obj];
  }

  return [];
};

const DynamicReportByRepId = ({ repIdNo, reportName }: DynamicReportByRepIdProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!repIdNo.trim()) {
        setError("Missing repIdNo for this report.");
        setRows([]);
        return;
      }

      setLoading(true);
      setError(null);
      setRows([]);

      const endpoints = endpointCandidates(repIdNo);
      let loaded = false;

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: "GET",
            credentials: "include",
            headers: {
              Accept: "application/json",
            },
          });

          if (!response.ok) {
            continue;
          }

          const payload = (await response.json()) as ApiResponse;
          const parsedRows = toRows(payload);

          if (cancelled) {
            return;
          }

          setRows(parsedRows);
          loaded = true;
          break;
        } catch {
          // Try next endpoint candidate.
        }
      }

      if (!cancelled && !loaded) {
        setError("No generic endpoint response found for this report yet.");
      }

      if (!cancelled) {
        setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [repIdNo]);

  const columns = useMemo(() => {
    const keySet = new Set<string>();
    for (const row of rows) {
      Object.keys(row).forEach((key) => keySet.add(key));
    }
    return Array.from(keySet);
  }, [rows]);

  if (loading) {
    return <div className="text-sm text-gray-600">Loading report data...</div>;
  }

  if (error) {
    return (
      <div className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
        <div className="font-medium mb-1">Fallback Report Page</div>
        <div>Report: {reportName}</div>
        <div>RepIdNo: {repIdNo || "N/A"}</div>
        <div className="mt-2">{error}</div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
        <div className="font-medium mb-1">Fallback Report Page</div>
        <div>Report: {reportName}</div>
        <div>RepIdNo: {repIdNo || "N/A"}</div>
        <div className="mt-2">No data rows returned.</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-gray-500">
        Dynamic fallback by RepIdNo: {repIdNo}
      </div>
      <div className="overflow-x-auto border border-gray-200 rounded">
        <table className="min-w-full text-xs">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-2 py-1 text-left font-semibold whitespace-nowrap">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 200).map((row, rowIndex) => (
              <tr key={rowIndex} className="border-t border-gray-100">
                {columns.map((column) => (
                  <td key={`${rowIndex}-${column}`} className="px-2 py-1 align-top whitespace-nowrap">
                    {String(row[column] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DynamicReportByRepId;
