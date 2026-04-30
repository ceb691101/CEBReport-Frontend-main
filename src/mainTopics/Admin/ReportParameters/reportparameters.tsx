import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { RefreshCw, Search } from "lucide-react";

type SaveParamForm = {
  paraId: string;
  paraDesc: string;
};

type LastSaveResult = {
  paraName?: string;
  found?: boolean;
  inserted?: boolean;
  updated?: boolean;
};

type ParameterRow = {
  paraId: string;
  paraName: string;
  description: string;
  populated: boolean;
};

const isPopulatedValue = (value: unknown): boolean => {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = (value ?? "").toString().trim().toLowerCase();
  return normalized === "1" || normalized === "yes" || normalized === "true";
};

const fieldBaseClass =
  "w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-800 shadow-sm outline-none transition focus:border-[#7A0000] focus:ring-2 focus:ring-[#7A0000]/10";

const buttonBaseClass =
  "rounded-lg px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";

const saveParamInitial: SaveParamForm = {
  paraId: "",
  paraDesc: "",
};

const ReportParameters = () => {
  const [saveForm, setSaveForm] = useState<SaveParamForm>(saveParamInitial);
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [onlyPopulated, setOnlyPopulated] = useState(false);
  const [parameterRows, setParameterRows] = useState<ParameterRow[]>([]);

  const [isSavingParam, setIsSavingParam] = useState(false);
  const [isUpdatingList, setIsUpdatingList] = useState(false);
  const [isLoadingParams, setIsLoadingParams] = useState(false);
  const [isDeletingParamName, setIsDeletingParamName] = useState<string | null>(null);
  const [deleteTargetRow, setDeleteTargetRow] = useState<ParameterRow | null>(null);
  const [editingParamName, setEditingParamName] = useState<string | null>(null);
  const [showPopulateConfirm, setShowPopulateConfirm] = useState(false);

  const [lastSaveResult, setLastSaveResult] = useState<LastSaveResult | null>(null);
  const [lastUpdatedRows, setLastUpdatedRows] = useState<number | null>(null);
  const isEditMode = Boolean(editingParamName);

  const orderedRows = useMemo(() => {
    const query = appliedSearch.trim().toUpperCase();

    const sortedRows = [...parameterRows].sort((a, b) => {
      const aNum = Number(a.paraId);
      const bNum = Number(b.paraId);
      const aIsNum = Number.isFinite(aNum) && a.paraId.trim() !== "";
      const bIsNum = Number.isFinite(bNum) && b.paraId.trim() !== "";

      if (aIsNum && bIsNum) {
        return aNum - bNum;
      }

      return a.paraName.localeCompare(b.paraName);
    });

    const rowsByPopulated = onlyPopulated
      ? sortedRows.filter((row) => row.populated)
      : sortedRows;

    if (!query) {
      return rowsByPopulated;
    }

    return rowsByPopulated.filter((row, index) => {
      const serialId = String(index + 1);

      return (
        serialId.includes(query) ||
        row.paraId.toUpperCase().includes(query) ||
        row.paraName.toUpperCase().includes(query) ||
        row.description.toUpperCase().includes(query)
      );
    });
  }, [parameterRows, onlyPopulated, appliedSearch]);

  const buildParamList = (_repId: string, rows: ParameterRow[]) => {
    const sourceRows = rows.length > 0 ? rows : parameterRows;

    if (sourceRows.length === 0) {
      return "";
    }

    const tokens = sourceRows.map((row) => `${row.paraName}=0`);
    return tokens.join("&");
  };

  const computedParamList = useMemo(() => {
    return buildParamList("", orderedRows);
  }, [orderedRows, parameterRows]);

  const loadParameters = async () => {
    setIsLoadingParams(true);

    try {
      const response = await fetch("/roleadminapi/api/reppara/GET_REPORTPARAMS");
      const payload = await response.json();

      if (payload?.errorMessage) {
        throw new Error(payload.errorMessage);
      }

      const rows: ParameterRow[] = Array.isArray(payload?.data)
        ? payload.data.map((item: any) => ({
            paraId: (item?.ParaId ?? item?.paraId ?? "").toString().trim(),
            paraName: (item?.ParaName ?? item?.paraName ?? "").toString().trim(),
            description: (item?.Description ?? item?.description ?? "").toString().trim(),
            populated: isPopulatedValue(item?.Populated ?? item?.populated),
          }))
        : [];

      setParameterRows(rows);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load report parameters.";
      toast.error(message);
      setParameterRows([]);
    } finally {
      setIsLoadingParams(false);
    }
  };

  useEffect(() => {
    loadParameters();
  }, []);

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
          paraId: "",
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

      await loadParameters();
      setEditingParamName(null);
      setSaveForm(saveParamInitial);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save parameter.";
      toast.error(message);
    } finally {
      setIsSavingParam(false);
    }
  };

  const resetSaveForm = () => {
    setSaveForm(saveParamInitial);
    setEditingParamName(null);
    setLastSaveResult(null);
  };

  const handlePopulateParamList = async () => {
    setIsUpdatingList(true);
    setLastUpdatedRows(null);

    try {
      const response = await fetch("/roleadminapi/api/reppara/populate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const payload = await response.json();

      if (payload?.errorMessage) {
        throw new Error(payload.errorMessage);
      }

      const rows     = Number(payload?.data?.updatedRows ?? 0);
      const params   = Number(payload?.data?.processedParams ?? 0);
      const appended = Number(payload?.data?.appendedParams ?? 0);
      setLastUpdatedRows(rows);

      if (params === 0) {
        toast.info("No pending parameters found to populate.");
      } else {
        toast.success(
          `Populate completed. Params processed: ${params}, reports updated: ${rows}, appended: ${appended}.`
        );
      }

      await loadParameters();

      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update parameter list.";
      toast.error(message);
      return false;
    } finally {
      setIsUpdatingList(false);
    }
  };

  const handlePopulateClick = async () => {
    setShowPopulateConfirm(true);
  };

  const confirmPopulate = async () => {
    setShowPopulateConfirm(false);
    await handlePopulateParamList();
  };

  const handleResetAll = () => {
    resetSaveForm();
    setLastUpdatedRows(null);
    setOnlyPopulated(false);
    setSearchInput("");
    setAppliedSearch("");
  };

  const handleSearchSubmit = (event: FormEvent) => {
    event.preventDefault();
    setAppliedSearch(searchInput);
  };

  const handleEditRow = (row: ParameterRow) => {
    setSaveForm({
      paraId: row.paraName,
      paraDesc: row.description || "",
    });
    setEditingParamName(row.paraName);
    setLastSaveResult(null);
  };

  const handleEditAction = () => {
    if (isEditMode) {
      return;
    }

    const paraName = saveForm.paraId.trim();
    if (!paraName) {
      toast.error("Select or enter a Parameter Name first.");
      return;
    }

    const row = parameterRows.find(
      (item) => item.paraName.toUpperCase() === paraName.toUpperCase()
    );

    if (!row) {
      toast.error("Parameter not found in table.");
      return;
    }

    handleEditRow(row);
  };

  const handleDeleteRow = (row: ParameterRow) => {
    const paraName = row.paraName.trim();

    if (!paraName) {
      toast.error("Parameter ID is invalid.");
      return;
    }

    setDeleteTargetRow(row);
  };

  const confirmDeleteRow = async () => {
    if (!deleteTargetRow) {
      return;
    }

    const paraName = deleteTargetRow.paraName.trim();

    if (!paraName) {
      toast.error("Parameter ID is invalid.");
      setDeleteTargetRow(null);
      return;
    }

    setIsDeletingParamName(paraName);

    try {
      const response = await fetch("/roleadminapi/api/reppara/delete-reportparams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paraId: paraName,
        }),
      });

      const payload = await response.json();

      if (payload?.errorMessage) {
        throw new Error(payload.errorMessage);
      }

      const deletedRows = Number(payload?.data?.deletedRows ?? 0);
      if (deletedRows > 0) {
        toast.success("Parameter deleted successfully.");
      } else {
        toast.info("No parameter deleted.");
      }

      if (editingParamName?.toUpperCase() === paraName.toUpperCase()) {
        resetSaveForm();
      }

      setDeleteTargetRow(null);

      await loadParameters();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete parameter.";
      toast.error(message);
    } finally {
      setIsDeletingParamName(null);
    }
  };

  const handleDeleteAction = () => {
    const paraName = saveForm.paraId.trim();
    if (!paraName) {
      toast.error("Select or enter a Parameter Name first.");
      return;
    }

    const row = parameterRows.find(
      (item) => item.paraName.toUpperCase() === paraName.toUpperCase()
    );

    if (!row) {
      toast.error("Parameter not found in table.");
      return;
    }

    handleDeleteRow(row);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(122,0,0,0.08),_transparent_35%),linear-gradient(180deg,_#faf7f2_0%,_#f3efe7_100%)] px-2 py-4 text-stone-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="grid gap-6 xl:grid-cols-[minmax(0,40%)_minmax(0,60%)] xl:items-start">
          <div className="w-full bg-white rounded-3xl shadow-sm border border-stone-200 p-6 flex flex-col h-full xl:order-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-stone-900">Report Parameters Form</h2>
            </div>

            <div className="mt-1 space-y-5">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-stone-600">Add / Populate Parameters</h3>
              </div>

              <form className="space-y-4" onSubmit={handleSaveParam}>
                {isEditMode && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                    Edit mode active for: {editingParamName}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Parameter Name</label>
                  <input
                    type="text"
                    className={fieldBaseClass}
                    value={saveForm.paraId}
                    onChange={(e) => setSaveForm({ ...saveForm, paraId: e.target.value })}
                    placeholder="e.g., PROVINCE"
                    disabled={isEditMode}
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

                <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-3">
                  <p className="text-xs font-semibold text-stone-600 mb-1">Generated URL Pattern</p>
                  <p className="text-xs font-mono text-[#8B0000] break-all">{computedParamList}</p>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type={isEditMode ? "button" : "submit"}
                    onClick={
                      isEditMode
                        ? () => {
                            setEditingParamName(null);
                          }
                        : undefined
                    }
                    className={`${buttonBaseClass} bg-[#7A0000] text-white hover:bg-[#620000]`}
                    disabled={isSavingParam}
                  >
                    {isSavingParam ? "ADDING..." : "ADD"}
                  </button>

                  <button
                    type={isEditMode ? "submit" : "button"}
                    onClick={isEditMode ? undefined : handleEditAction}
                    className={`${buttonBaseClass} bg-[#7A0000]/85 text-white hover:bg-[#620000]`}
                    disabled={isSavingParam}
                  >
                    {isSavingParam && isEditMode ? "UPDATING..." : "EDIT"}
                  </button>

                  <button
                    type="button"
                    onClick={handlePopulateClick}
                    className={`${buttonBaseClass} bg-[#7A0000]/85 text-white hover:bg-[#620000] inline-flex items-center gap-2`}
                    disabled={isUpdatingList}
                  >
                    <RefreshCw className={`h-4 w-4 ${isUpdatingList ? "animate-spin" : ""}`} />
                    {isUpdatingList ? "POPULATING..." : "POPULATE"}
                  </button>

                  <button
                    type="button"
                    onClick={handleDeleteAction}
                    className={`${buttonBaseClass} bg-[#8E8E8E] text-white hover:bg-[#7A7A7A]`}
                    disabled={Boolean(isDeletingParamName) || isLoadingParams}
                  >
                    {isDeletingParamName ? "DELETING..." : "DELETE"}
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
                </div>
              )}
            </div>
          </div>

          <div className="w-full bg-white rounded-3xl shadow-sm border border-stone-200 p-6 flex flex-col h-full xl:order-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-stone-900">Report Parameters Table</h2>
              <button
                type="button"
                onClick={loadParameters}
                className="inline-flex items-center gap-2 rounded-full border border-[#7A0000]/20 px-4 py-2 text-sm font-medium text-[#7A0000] transition hover:border-[#7A0000]/40 hover:bg-[#7A0000]/5"
              >
                <RefreshCw className={`h-4 w-4 ${isLoadingParams ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-semibold">
              <form onSubmit={handleSearchSubmit} className="mr-2 flex min-w-[280px] flex-1 items-center gap-2">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSearchInput(value);
                    setAppliedSearch(value);
                  }}
                  placeholder="Search ID / Name / Description"
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 shadow-sm outline-none transition focus:border-[#7A0000] focus:ring-2 focus:ring-[#7A0000]/10"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput("");
                    setAppliedSearch("");
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#7A0000]/25 bg-white px-6 py-2 text-sm font-semibold text-[#7A0000] transition hover:bg-[#7A0000]/5"
                >
                  <Search className="h-4 w-4" />
                  Clear
                </button>
              </form>

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
                      <th className="px-4 py-2 border border-stone-200 w-24">Parameter ID</th>
                      <th className="px-4 py-2 border border-stone-200">Parameter Name</th>
                      <th className="px-4 py-2 border border-stone-200">Description</th>
                      <th className="px-4 py-2 border border-stone-200 w-28">Populated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingParams ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-10 text-center text-stone-500 border border-stone-200">
                          <RefreshCw className="mr-2 inline h-4 w-4 animate-spin" />
                          Loading parameters...
                        </td>
                      </tr>
                    ) : orderedRows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-10 text-center text-stone-500 border border-stone-200">
                          No parameters available.
                        </td>
                      </tr>
                    ) : (
                      orderedRows.map((row, index) => (
                        <tr
                          key={`${row.paraId}-${row.paraName}`}
                          onClick={() => handleEditRow(row)}
                          className={`hover:bg-[#7A0000]/5 transition-colors ${
                            editingParamName?.toUpperCase() === row.paraName.toUpperCase()
                              ? "bg-amber-50"
                              : ""
                          }`}
                        >
                          <td className="px-4 py-2 border border-stone-200 text-stone-700">{index + 1}</td>
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

      {deleteTargetRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/45 px-4">
          <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-stone-900">Delete Parameter</h3>
            <p className="mt-2 text-sm text-stone-600">
              Are you sure you want to delete
              <span className="mx-1 font-semibold text-stone-900">
                {deleteTargetRow.paraName}
              </span>
              ?
            </p>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTargetRow(null)}
                className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
                disabled={Boolean(isDeletingParamName)}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteRow}
                className="rounded-lg bg-[#8E8E8E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#7A7A7A] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={Boolean(isDeletingParamName)}
              >
                {isDeletingParamName ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPopulateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/45 px-4">
          <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-stone-900">Populate Parameters</h3>
            <p className="mt-2 text-sm text-stone-600">
              Are you sure you want to populate all pending parameters to all reports?
            </p>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowPopulateConfirm(false)}
                className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
                disabled={isUpdatingList}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmPopulate}
                className="rounded-lg bg-[#7A0000] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#620000] disabled:cursor-not-allowed disabled:opacity-60 inline-flex items-center gap-2"
                disabled={isUpdatingList}
              >
                <RefreshCw className={`h-4 w-4 ${isUpdatingList ? "animate-spin" : ""}`} />
                {isUpdatingList ? "Populating..." : "Populate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportParameters;
