import { FormEvent, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { CheckSquare, RefreshCw, Square } from "lucide-react";

type CategoryRecord = {
    catCode: string;
    catName: string;
};

type ReportEntryRecord = {
    repIdNo: number;
    repId: string;
    catCode: string;
    repName: string;
    paramList: string;
    favorite: number;
    active: number;
};

type ReportParameterRecord = {
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

type CreateEntryForm = {
    repIdNo: number;
    repId: string;
    catCode: string;
    repName: string;
    favorite: boolean;
    active: boolean;
};

const initialForm: CreateEntryForm = {
    repIdNo: 0,
    repId: "",
    catCode: "",
    repName: "",
    favorite: true,
    active: true,
};

const fieldBaseClass =
    "w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-800 shadow-sm outline-none transition focus:border-[#7A0000] focus:ring-2 focus:ring-[#7A0000]/10 disabled:bg-stone-100 disabled:text-stone-500";

const actionButtonPrimaryClass =
    "rounded-lg bg-[#7A0000] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#620000] disabled:cursor-not-allowed disabled:opacity-60";

const actionButtonSoftClass =
    "rounded-lg bg-[#7A0000]/85 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#620000] disabled:cursor-not-allowed disabled:opacity-50";

const actionButtonDarkClass =
    "rounded-lg bg-stone-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50";

const actionButtonLightClass =
    "rounded-lg border border-[#7A0000]/20 bg-white px-5 py-2.5 text-sm font-semibold text-[#7A0000] transition hover:bg-[#7A0000]/5";

const normalizeRepId = (value: string) => value.trim().toUpperCase();

const ReportEntry = () => {
    const [categories, setCategories] = useState<CategoryRecord[]>([]);
    const [entries, setEntries] = useState<ReportEntryRecord[]>([]);
    const [parameters, setParameters] = useState<ReportParameterRecord[]>([]);
    const [selectedParameters, setSelectedParameters] = useState<string[]>([]);
    const [selectedRepIdNo, setSelectedRepIdNo] = useState<number | null>(null);
    const [selectedCatCode, setSelectedCatCode] = useState<string | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [isEntriesLoading, setIsEntriesLoading] = useState(false);
    const [isParametersLoading, setIsParametersLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [form, setForm] = useState<CreateEntryForm>(initialForm);
    const [mode, setMode] = useState<"add" | "edit">("add");

    const loadCategories = async () => {
        setIsLoading(true);

        try {
            const response = await fetch("/roleadminapi/api/reportcategory");
            const payload = await response.json();

            if (payload?.errorMessage) {
                throw new Error(payload.errorMessage);
            }

            const nextCategories = Array.isArray(payload?.data)
                ? payload.data.map((item: any) => ({
                    catCode: item?.CatCode ?? item?.catCode ?? "",
                    catName: item?.CatName ?? item?.catName ?? "",
                }))
                : [];
            setCategories(nextCategories);
        } catch (error) {
            console.error("Failed to load categories:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadReportEntries = async () => {
        setIsEntriesLoading(true);

        try {
            const response = await fetch("/roleadminapi/api/reportentry");
            const payload = await response.json();

            if (payload?.errorMessage) {
                throw new Error(payload.errorMessage);
            }

            const nextEntries = Array.isArray(payload?.data)
                ? payload.data.map((item: any) => ({
                    repIdNo: Number(item?.RepIdNo ?? item?.repIdNo ?? 0),
                    repId: item?.RepId ?? item?.repId ?? "",
                    catCode: item?.CatCode ?? item?.catCode ?? "",
                    repName: item?.RepName ?? item?.repName ?? "",
                    paramList: item?.ParamList ?? item?.paramList ?? "",
                    favorite: Number(item?.Favorite ?? item?.favorite ?? 0),
                    active: Number(item?.Active ?? item?.active ?? 0),
                }))
                : [];

            setEntries(nextEntries);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to load report entries.";
            toast.error(message);
            setEntries([]);
        } finally {
            setIsEntriesLoading(false);
        }
    };

    const loadParameters = async () => {
        setIsParametersLoading(true);

        try {
            const response = await fetch("/roleadminapi/api/reppara/GET_POPEDREPPARAMS");
            const payload = await response.json();

            if (payload?.errorMessage) {
                throw new Error(payload.errorMessage);
            }

            const nextParameters = Array.isArray(payload?.data)
                ? payload.data.map((item: any) => ({
                    paraName: (item?.ParaName ?? item?.paraName ?? "").toString().trim(),
                    description: (item?.Description ?? item?.description ?? "").toString().trim(),
                    populated: isPopulatedValue(item?.Populated ?? item?.populated),
                }))
                : [];

            setParameters(nextParameters);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to load report parameters.";
            toast.error(message);
            setParameters([]);
        } finally {
            setIsParametersLoading(false);
        }
    };

    const buildParamListValue = (reportId: string, paraNames: string[]) => {
        const uniqueParams = Array.from(new Set(paraNames.map((item) => item.trim()).filter(Boolean)));
        if (uniqueParams.length === 0) {
            return `<${reportId.trim()}>`;
        }

        const tokenString = uniqueParams.map((item) => `${item}=0`).join("&");
        return `<${reportId.trim()}>&${tokenString}`;
    };

    const extractParamsFromList = (paramListValue: string) => {
        const raw = (paramListValue || "").trim();
        if (!raw) return [] as string[];

        const normalized = raw.startsWith("<")
            ? raw.replace(/^<[^>]*>&?/, "")
            : raw;

        return normalized
            .split("&")
            .map((token) => token.trim())
            .filter(Boolean)
            .map((token) => token.split("=")[0]?.trim())
            .filter(Boolean);
    };

    const handleAdd = async (e?: FormEvent) => {
        if (e) e.preventDefault();

        const normalizedRepId = normalizeRepId(form.repId);

        if (!normalizedRepId || !form.catCode.trim() || !form.repName.trim()) {
            toast.error("Report ID, Category, and Name are required.");
            return;
        }

        setIsSubmitting(true);

        try {
            // Fetch next ID if repIdNo is not set
            let nextRepIdNo = form.repIdNo;
            if (nextRepIdNo === 0) {
                const nextIdResponse = await fetch("/roleadminapi/api/reportentry/nextid");
                const nextIdPayload = await nextIdResponse.json();

                if (nextIdPayload?.errorMessage) {
                    throw new Error(nextIdPayload.errorDetails ? `${nextIdPayload.errorMessage} Details: ${nextIdPayload.errorDetails}` : nextIdPayload.errorMessage);
                }

                nextRepIdNo = nextIdPayload?.data ?? 0;
                if (nextRepIdNo === 0) {
                    throw new Error("Failed to generate Report Entry ID.");
                }
            }

            const paramList = buildParamListValue(normalizedRepId, selectedParameters);

            const response = await fetch("/roleadminapi/api/reportentry", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    repIdNo: nextRepIdNo,
                    repId: normalizedRepId,
                    catCode: form.catCode.trim(),
                    repName: form.repName.trim(),
                    paramList,
                    favorite: form.favorite ? 1 : 0,
                    active: form.active ? 1 : 0,
                }),
            });

            const payload = await response.json();

            if (payload?.errorMessage) {
                throw new Error(payload.errorDetails ? `${payload.errorMessage} Details: ${payload.errorDetails}` : payload.errorMessage);
            }

            toast.success(payload?.data?.message || "Report entry added successfully.");
            handleReset();
            await loadReportEntries();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to add report entry.";
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = async (e?: FormEvent) => {
        if (e) e.preventDefault();

        if (selectedRepIdNo === null || !selectedCatCode) {
            toast.error("Please select a report entry to edit.");
            return;
        }

        if (!form.catCode.trim() || !form.repName.trim()) {
            toast.error("Category and Name are required.");
            return;
        }

        setIsSubmitting(true);

        try {
            const paramList = buildParamListValue(normalizeRepId(form.repId), selectedParameters);

            const response = await fetch(
                `/roleadminapi/api/reportentry/${selectedRepIdNo}/${encodeURIComponent(selectedCatCode)}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        catCode: form.catCode.trim(),
                        repName: form.repName.trim(),
                        paramList,
                        favorite: form.favorite ? 1 : 0,
                        active: form.active ? 1 : 0,
                    }),
                }
            );

            const payload = await response.json();

            if (payload?.errorMessage) {
                throw new Error(payload.errorDetails ? `${payload.errorMessage} Details: ${payload.errorDetails}` : payload.errorMessage);
            }

            if (payload?.data && !payload.data.success) {
                throw new Error(payload.data.message || "Failed to update report entry.");
            }

            toast.success(payload?.data?.message || "Report entry updated successfully.");
            handleReset();
            await loadReportEntries();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to update report entry.";
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (selectedRepIdNo === null || !selectedCatCode) {
            toast.error("No entry selected for deletion.");
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch(
                `/roleadminapi/api/reportentry/${selectedRepIdNo}/${encodeURIComponent(selectedCatCode)}`,
                {
                    method: "DELETE",
                }
            );

            const payload = await response.json();

            if (payload?.errorMessage) {
                throw new Error(payload.errorDetails ? `${payload.errorMessage} Details: ${payload.errorDetails}` : payload.errorMessage);
            }

            if (payload?.data && !payload.data.success) {
                throw new Error(payload.data.message || "Failed to delete report entry.");
            }

            toast.success(payload?.data?.message || "Report entry deleted successfully.");
            handleReset();
            await loadReportEntries();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to delete report entry.";
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };



    const handleRowClick = (entry: ReportEntryRecord) => {
        setSelectedRepIdNo(entry.repIdNo);
        setSelectedCatCode(entry.catCode);
        setForm({
            repIdNo: entry.repIdNo,
            repId: entry.repId,
            catCode: entry.catCode,
            repName: entry.repName,
            favorite: entry.active === 1 && entry.favorite === 1,
            active: entry.active === 1,
        });
        setSelectedParameters(extractParamsFromList(entry.paramList));
        setMode("edit");
    };

    const handleReset = () => {
        setForm(initialForm);
        setMode("add");
        setSelectedRepIdNo(null);
        setSelectedCatCode(null);
        setSelectedParameters([]);
    };

    useEffect(() => {
        loadCategories();
        loadReportEntries();
        loadParameters();
    }, []);

    const getCategoryLabel = (catCode: string) => {
        const category = categories.find((item) => item.catCode === catCode);
        return category ? `${catCode} - ${category.catName}` : catCode;
    };

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(122,0,0,0.08),_transparent_35%),linear-gradient(180deg,_#faf7f2_0%,_#f3efe7_100%)] px-2 py-4 text-stone-900">
            <div className="mx-auto max-w-7xl space-y-6">
                <section className="grid gap-6 xl:grid-cols-[minmax(0,40%)_minmax(0,60%)] xl:items-start">
                    <form
                        onSubmit={(event) => event.preventDefault()}
                        className="h-fit w-full rounded-[28px] border border-[#7A0000]/10 bg-white p-6 shadow-[0_16px_50px_rgba(122,0,0,0.08)]"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-semibold text-stone-900">Report Entry Form</h2>
                            </div>
                            <button
                                type="button"
                                onClick={loadCategories}
                                className="inline-flex items-center gap-2 rounded-full border border-[#7A0000]/20 px-4 py-2 text-sm font-medium text-[#7A0000] transition hover:border-[#7A0000]/40 hover:bg-[#7A0000]/5"
                            >
                                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                                Refresh
                            </button>
                        </div>

                        <div className="mt-6 space-y-6">
                            <div className="grid gap-4">
                                <div className="flex gap-4">
                                    <Input
                                        label="Report ID NO"
                                        value={form.repIdNo ? form.repIdNo.toString() : ""}
                                        onChange={(value) => {
                                            const nextValue = value.trim();
                                            setForm({
                                                ...form,
                                                repIdNo: nextValue === "" ? 0 : Number(nextValue),
                                            });
                                        }}
                                        placeholder="Enter report id no"
                                        type="number"
                                    />
                                    <Input
                                        label="Report ID"
                                        value={form.repId}
                                        onChange={(value) => setForm({ ...form, repId: value.toUpperCase() })}
                                        placeholder="e.g., REP01"
                                        disabled={mode === "edit"}
                                    />
                                </div>

                                <Select
                                    label="Category"
                                    value={form.catCode}
                                    onChange={(value) => setForm({ ...form, catCode: value })}
                                    options={categories.map(c => c.catCode)}
                                    optionValues={categories.map(c => c.catCode)}
                                    placeholder="Select a category"
                                />

                                <Input
                                    label="Report Name"
                                    value={form.repName}
                                    onChange={(value) => setForm({ ...form, repName: value })}
                                    placeholder="e.g., Monthly Summary"
                                />

                                <div>
                                    <span className="mb-2 block text-sm font-medium text-stone-700">Report Parameters</span>
                                    <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-3">
                                        {isParametersLoading ? (
                                            <div className="text-xs text-stone-500">Loading parameters...</div>
                                        ) : parameters.length === 0 ? (
                                            <div className="text-xs text-stone-500">No parameters found in parameter table.</div>
                                        ) : (
                                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                                {parameters.map((parameter) => {
                                                    const isChecked = selectedParameters.some(
                                                        (item) => item.toUpperCase() === parameter.paraName.toUpperCase()
                                                    );

                                                    return (
                                                        <Checkbox
                                                            key={parameter.paraName}
                                                            label={parameter.description
                                                                ? `${parameter.paraName} - ${parameter.description}`
                                                                : parameter.paraName}
                                                            checked={isChecked}
                                                            onChange={(checked) => {
                                                                setSelectedParameters((current) => {
                                                                    if (checked) {
                                                                        return Array.from(new Set([...current, parameter.paraName]));
                                                                    }
                                                                    return current.filter(
                                                                        (item) => item.toUpperCase() !== parameter.paraName.toUpperCase()
                                                                    );
                                                                });
                                                            }}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3">
                                    <p className="text-xs font-semibold text-stone-600">Generated Parameters URL Pattern</p>
                                    <p className="mt-1 break-all font-mono text-xs text-[#8B0000]">
                                        {form.repId.trim()
                                            ? buildParamListValue(normalizeRepId(form.repId), selectedParameters)
                                            : "Enter Report ID to generate parameter URL pattern."}
                                    </p>
                                </div>

                                <div className="flex gap-6 mt-2">
                                    <Checkbox
                                        label="Add to Favourite :"
                                        checked={form.favorite}
                                        asImage
                                        onChange={(checked) => setForm({ ...form, favorite: checked })}
                                        disabled={!form.active}
                                    />
                                    <Checkbox
                                        label="Active Report :"
                                        checked={form.active}
                                        asImage
                                        onChange={(checked) =>
                                            setForm((current) => ({
                                                ...current,
                                                active: checked,
                                                favorite: checked,
                                            }))
                                        }
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={() => handleAdd()}
                                disabled={isSubmitting}
                                className={actionButtonPrimaryClass}
                            >
                                {isSubmitting ? "Saving..." : "ADD"}
                            </button>
                            <button
                                type="button"
                                onClick={() => handleEdit()}
                                disabled={selectedRepIdNo === null || !selectedCatCode || isSubmitting}
                                className={actionButtonSoftClass}
                            >
                                {isSubmitting ? "Updating..." : "EDIT"}
                            </button>
                            <button
                                type="button"
                                disabled={selectedRepIdNo === null || !selectedCatCode || isSubmitting}
                                onClick={handleDelete}
                                className={actionButtonDarkClass}
                            >
                                DELETE
                            </button>
                            <button
                                type="button"
                                onClick={handleReset}
                                className={actionButtonLightClass}
                            >
                                RESET
                            </button>
                        </div>
                    </form>

                    <div className="w-full rounded-[28px] border border-[#7A0000]/10 bg-white p-6 shadow-[0_16px_50px_rgba(122,0,0,0.08)]">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <h2 className="text-2xl font-semibold text-stone-900">Report Entry Table</h2>
                            <button
                                type="button"
                                onClick={loadReportEntries}
                                className="inline-flex items-center gap-2 rounded-full border border-[#7A0000]/20 px-4 py-2 text-sm font-medium text-[#7A0000] transition hover:border-[#7A0000]/40 hover:bg-[#7A0000]/5"
                            >
                                <RefreshCw className={`h-4 w-4 ${isEntriesLoading ? "animate-spin" : ""}`} />
                                Refresh
                            </button>
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-50/40">
                            <div className="max-h-[520px] overflow-auto">
                                <table className="w-full border-collapse text-left text-sm">
                                    <thead className="sticky top-0 bg-stone-100 text-xs uppercase tracking-[0.15em] text-stone-500">
                                        <tr>
                                            <th className="border border-stone-200 px-3 py-2 text-center">Report ID NO</th>
                                            <th className="border border-stone-200 px-3 py-2">Category</th>
                                            <th className="border border-stone-200 px-3 py-2">Name</th>
                                            <th className="border border-stone-200 px-3 py-2">Parameters</th>
                                            <th className="border border-stone-200 px-3 py-2 text-center">Favorite</th>
                                            <th className="border border-stone-200 px-3 py-2 text-center">Active</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {isEntriesLoading ? (
                                            <tr>
                                                <td colSpan={6} className="px-3 py-8 text-center text-stone-500">
                                                    <RefreshCw className="mr-2 inline h-4 w-4 animate-spin" />
                                                    Loading report entries...
                                                </td>
                                            </tr>
                                        ) : entries.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-3 py-8 text-center text-stone-500">
                                                    No report entries found.
                                                </td>
                                            </tr>
                                        ) : (
                                            entries.map((entry) => (
                                                <tr
                                                    key={`${entry.repIdNo}-${entry.catCode}-${entry.repId}`}
                                                    onClick={() => handleRowClick(entry)}
                                                    className={`cursor-pointer transition ${selectedRepIdNo === entry.repIdNo && selectedCatCode === entry.catCode ? "bg-blue-50" : "bg-white hover:bg-stone-50"}`}
                                                >
                                                    <td className="border border-stone-200 px-3 py-2 text-center">{entry.repIdNo || "-"}</td>
                                                    <td className="border border-stone-200 px-3 py-2">{getCategoryLabel(entry.catCode)}</td>
                                                    <td className="border border-stone-200 px-3 py-2 font-semibold text-stone-800">{entry.repId || "-"}</td>
                                                    <td className="border border-stone-200 px-3 py-2">{entry.paramList || "-"}</td>
                                                    <td className="border border-stone-200 px-3 py-2 text-center">{entry.favorite === 1 ? "Yes" : "No"}</td>
                                                    <td className="border border-stone-200 px-3 py-2 text-center">{entry.active === 1 ? "Yes" : "No"}</td>
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

const Input = ({
    label,
    value,
    onChange,
    type = "text",
    placeholder,
    disabled
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    placeholder?: string;
    disabled?: boolean;
}) => (
    <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-stone-700">{label}</span>
        <input
            type={type}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            className={fieldBaseClass}
            disabled={disabled}
        />
    </label>
);

const Select = ({
    label,
    value,
    onChange,
    options,
    optionValues,
    placeholder,
    disabled
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: string[];
    optionValues?: string[];
    placeholder?: string;
    disabled?: boolean;
}) => (
    <label className="block h-full">
        <span className="mb-1.5 block text-sm font-medium text-stone-700">{label}</span>
        <select
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className={fieldBaseClass}
            disabled={disabled}
        >
            <option value="">{placeholder ?? "Select an option"}</option>
            {options.map((option, index) => (
                <option key={option} value={optionValues?.[index] ?? option}>
                    {option}
                </option>
            ))}
        </select>
    </label>
);

const Checkbox = ({
    label,
    checked,
    onChange,
    disabled,
    asImage = false
}: {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    asImage?: boolean;
}) => (
    <label className={`mt-1 flex items-center gap-2 ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}>
        {asImage ? (
            <button
                type="button"
                onClick={() => !disabled && onChange(!checked)}
                disabled={disabled}
                className="inline-flex h-6 w-6 items-center justify-center disabled:opacity-50"
                aria-label={label}
            >
                {checked ? (
                    <CheckSquare className="h-6 w-6 text-green-600" />
                ) : (
                    <Square className="h-6 w-6 text-stone-400" />
                )}
            </button>
        ) : (
            <input
                type="checkbox"
                checked={checked}
                onChange={(event) => onChange(event.target.checked)}
                className="h-5 w-5 rounded-md border-stone-300 text-[#7A0000] focus:ring-[#7A0000] shadow-sm disabled:opacity-50"
                disabled={disabled}
            />
        )}
        <span className="text-sm font-semibold text-stone-800">{label}</span>
    </label>
);

export default ReportEntry;
