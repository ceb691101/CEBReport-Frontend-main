import { FormEvent, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { RefreshCw } from "lucide-react";

type SaveParamForm = {
  paraId: string;
  paraDesc: string;
};

type PopulateParamForm = {
  repId: string;
  overrideParamList: string;
};

type LastSaveResult = {
  paraName?: string;
  found?: boolean;
  inserted?: boolean;
  updated?: boolean;
};

type ParameterRow = {
  paraName: string;
  description: string;
  populated: boolean;
};

const alphabetFilters = [
  "A",
  "C",
  "D",
  "E",
  "F",
  "G",
  "M",
  "P",
  "R",
  "S",
  "T",
  "W",
  "Y",
  "All",
] as const;

const fieldBaseClass =
  "w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-800 shadow-sm outline-none transition focus:border-[#7A0000] focus:ring-2 focus:ring-[#7A0000]/10";

const buttonBaseClass =
  "rounded-lg px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";

const saveParamInitial: SaveParamForm = {
  paraId: "",
  paraDesc: "",
};

const populateInitial: PopulateParamForm = {
  repId: "",
  overrideParamList: "",
};

const ReportParameters = () => {
  const [saveForm, setSaveForm] = useState<SaveParamForm>(saveParamInitial);
  const [populateForm, setPopulateForm] = useState<PopulateParamForm>(populateInitial);
  const [letterFilter, setLetterFilter] = useState<(typeof alphabetFilters)[number]>("All");
  const [onlyPopulated, setOnlyPopulated] = useState(false);
  const [parameterRows, setParameterRows] = useState<ParameterRow[]>([]);

  const [isSavingParam, setIsSavingParam] = useState(false);
  const [isUpdatingList, setIsUpdatingList] = useState(false);

  const [lastSaveResult, setLastSaveResult] = useState<LastSaveResult | null>(null);
  const [lastUpdatedRows, setLastUpdatedRows] = useState<number | null>(null);

  const filteredRows = useMemo(() => {
    return parameterRows.filter((row) => {
      const byLetter =
        letterFilter === "All"
          ? true
          : row.paraName.toUpperCase().startsWith(letterFilter.toUpperCase());

      const byPopulated = onlyPopulated ? row.populated : true;
      return byLetter && byPopulated;
    });
  }, [parameterRows, letterFilter, onlyPopulated]);

  const computedParamList = useMemo(() => {
    const sourceRows = filteredRows.length > 0 ? filteredRows : parameterRows;

    if (sourceRows.length === 0) {
      return "<REP_ID>";
    }

    const tokens = sourceRows.map((row) => `${row.paraName}=0`);
    return `<REP_ID>&${tokens.join("&")}`;
  }, [filteredRows, parameterRows]);

  const paramListToSave = useMemo(() => {
    const override = populateForm.overrideParamList.trim();
    return override || computedParamList;
  }, [populateForm.overrideParamList, computedParamList]);

  const handleSaveParam = async (event: FormEvent) => {
    event.preventDefault();

    if (!saveForm.paraId.trim()) {
      toast.error("Parameter ID is required.");
      return;
    }

    setIsSavingParam(true);
    setLastSaveResult(null);

    try {
      const response = await fetch("/roleadminapi/api/reppara/save-reportparams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paraId: saveForm.paraId.trim(),
          paraDesc: saveForm.paraDesc.trim(),
        }),
      });

      const payload = await response.json();

      if (payload?.errorMessage) {
        throw new Error(payload.errorMessage);
      }

      const data = payload?.data ?? {};
      const nextResult: LastSaveResult = {
        paraName: data?.ParaName ?? data?.paraName ?? saveForm.paraId.trim(),
        found: Boolean(data?.Found ?? data?.found),
        inserted: Boolean(data?.Inserted ?? data?.inserted),
        updated: Boolean(data?.Updated ?? data?.updated),
      };

      setLastSaveResult(nextResult);

      if (nextResult.inserted) {
        toast.success("Parameter inserted successfully.");
      } else if (nextResult.updated) {
        toast.success("Parameter updated successfully.");
      } else {
        toast.success("Parameter saved successfully.");
      }

      const paraName = (nextResult.paraName || saveForm.paraId).trim().toUpperCase();
      const description = saveForm.paraDesc.trim();

      setParameterRows((current) => {
        const index = current.findIndex((row) => row.paraName.toUpperCase() === paraName);
        const nextRow: ParameterRow = {
          paraName,
          description,
          populated: false,
        };

        if (index === -1) {
          return [...current, nextRow].sort((a, b) => a.paraName.localeCompare(b.paraName));
        }

        const copy = [...current];
        copy[index] = {
          ...copy[index],
          description: description || copy[index].description,
        };
        return copy.sort((a, b) => a.paraName.localeCompare(b.paraName));
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save parameter.";
      toast.error(message);
    } finally {
      setIsSavingParam(false);
    }
  };

  const handlePopulateParamList = async (event?: FormEvent) => {
    if (event) event.preventDefault();

    if (!populateForm.repId.trim()) {
      toast.error("Report ID is required.");
      return;
    }

    setIsUpdatingList(true);
    setLastUpdatedRows(null);

    try {
      const response = await fetch("/roleadminapi/api/reppara/populateparamts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repId: populateForm.repId.trim(),
          paramList: paramListToSave,
        }),
      });

      const payload = await response.json();

      if (payload?.errorMessage) {
        throw new Error(payload.errorMessage);
      }

      const rows = Number(payload?.data?.updatedRows ?? 0);
      setLastUpdatedRows(rows);

      if (rows > 0) {
        toast.success("Report parameter list updated.");
        setParameterRows((current) => current.map((row) => ({ ...row, populated: true })));
      } else {
        toast.info("No rows updated. Check Report ID.");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update parameter list.";
      toast.error(message);
    } finally {
      setIsUpdatingList(false);
    }
  };

  const resetSaveForm = () => {
    setSaveForm(saveParamInitial);
    setLastSaveResult(null);
  };

  const resetPopulateForm = () => {
    setPopulateForm(populateInitial);
    setLastUpdatedRows(null);
  };

  const handleResetAll = () => {
    resetSaveForm();
    resetPopulateForm();
    setLetterFilter("All");
    setOnlyPopulated(false);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(122,0,0,0.08),_transparent_35%),linear-gradient(180deg,_#faf7f2_0%,_#f3efe7_100%)] px-2 py-4 text-stone-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="grid gap-6 xl:grid-cols-[1fr_1.5fr]">
          <div className="bg-white rounded-3xl shadow-sm border border-stone-200 p-6 flex flex-col h-full xl:order-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-stone-900">Report Parameters Form</h2>
            </div>

            <div className="mt-1 space-y-5">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-stone-600">Add / Populate Parameters</h3>
              </div>

              <form className="space-y-4" onSubmit={handleSaveParam}>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Parameter Name</label>
                  <input
                    type="text"
                    className={fieldBaseClass}
                    value={saveForm.paraId}
                    onChange={(e) => setSaveForm({ ...saveForm, paraId: e.target.value })}
                    placeholder="e.g., PROVINCE"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Description</label>
                  <input
                    type="text"
                    className={fieldBaseClass}
                    value={saveForm.paraDesc}
                    onChange={(e) => setSaveForm({ ...saveForm, paraDesc: e.target.value })}
                    placeholder="e.g., Province"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Report ID</label>
                  <input
                    type="text"
                    className={fieldBaseClass}
                    value={populateForm.repId}
                    onChange={(e) => setPopulateForm({ ...populateForm, repId: e.target.value })}
                    placeholder="e.g., RPT_001"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Override Param List (Optional)</label>
                  <input
                    type="text"
                    className={fieldBaseClass}
                    value={populateForm.overrideParamList}
                    onChange={(e) =>
                      setPopulateForm({
                        ...populateForm,
                        overrideParamList: e.target.value,
                      })
                    }
                    placeholder="Leave empty to use generated URL pattern"
                  />
                </div>

                <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-3">
                  <p className="text-xs font-semibold text-stone-600 mb-1">Generated URL Pattern</p>
                  <p className="text-xs font-mono text-[#8B0000] break-all">{computedParamList}</p>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="submit"
                    className={`${buttonBaseClass} bg-[#7A0000] text-white hover:bg-[#620000]`}
                    disabled={isSavingParam}
                  >
                    {isSavingParam ? "ADDING..." : "ADD"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePopulateParamList()}
                    className={`${buttonBaseClass} bg-[#7A0000]/85 text-white hover:bg-[#620000] inline-flex items-center gap-2`}
                    disabled={isUpdatingList}
                  >
                    <RefreshCw className={`h-4 w-4 ${isUpdatingList ? "animate-spin" : ""}`} />
                    {isUpdatingList ? "POPULATING..." : "POPULATE"}
                  </button>

                  <button
                    type="button"
                    onClick={handleResetAll}
                    className={`${buttonBaseClass} border border-[#7A0000]/20 bg-white text-[#7A0000] hover:bg-[#7A0000]/5`}
                  >
                    RESET
                  </button>
                </div>
              </form>

              {(lastSaveResult || lastUpdatedRows !== null) && (
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
                  {lastSaveResult && (
                    <p>
                      Last ADD: {lastSaveResult.paraName || "-"} ({lastSaveResult.inserted ? "Inserted" : lastSaveResult.updated ? "Updated" : "Processed"})
                    </p>
                  )}
                  {lastUpdatedRows !== null && <p>Last POPULATE updated rows: {lastUpdatedRows}</p>}
                  <p className="break-all">Applied param list value: {paramListToSave}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-stone-200 p-6 flex flex-col h-full xl:order-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-stone-900">Report Parameters Table</h2>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-semibold">
              {alphabetFilters.map((letter) => (
                <button
                  key={letter}
                  type="button"
                  onClick={() => setLetterFilter(letter)}
                  className={`rounded-full px-3 py-1 border transition-colors ${
                    letterFilter === letter
                      ? "bg-[#7A0000] text-white border-[#7A0000]"
                      : "bg-white text-[#7A0000] border-[#7A0000]/25 hover:bg-[#7A0000]/5"
                  }`}
                >
                  {letter}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setOnlyPopulated((current) => !current)}
                className={`rounded-full px-3 py-1 border transition-colors ${
                  onlyPopulated
                    ? "bg-stone-800 text-white border-stone-800"
                    : "bg-white text-stone-700 border-stone-300 hover:bg-stone-100"
                }`}
              >
                Toggle Populated
              </button>
            </div>

            <div className="flex-1 overflow-hidden rounded-2xl border border-stone-200 bg-stone-50/40">
              <div className="max-h-[560px] overflow-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-stone-100 text-stone-500 text-xs uppercase tracking-[0.15em]">
                    <tr>
                      <th className="px-4 py-2 border border-stone-200">Parameter Name</th>
                      <th className="px-4 py-2 border border-stone-200">Description</th>
                      <th className="px-4 py-2 border border-stone-200 w-28">Populated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-10 text-center text-stone-500 border border-stone-200">
                          No parameters available.
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((row) => (
                        <tr key={row.paraName} className="hover:bg-[#7A0000]/5 transition-colors">
                          <td className="px-4 py-2 border border-stone-200 font-semibold text-stone-800">{row.paraName}</td>
                          <td className="px-4 py-2 border border-stone-200 text-stone-700">{row.description || "-"}</td>
                          <td className="px-4 py-2 border border-stone-200 text-stone-700">{row.populated ? "Yes" : "No"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ReportParameters;
