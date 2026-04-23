import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { RefreshCw, Search } from "lucide-react";

// Single record coming from backend
// Backend: GET /roleadminapi/api/reportcategory -> data: [{ CatCode, CatName }]
type CategoryRecord = {
  catCode: string;
  catName: string;
};

// Form state for create / update
type CreateCategoryForm = {
  catCode: string;
  catName: string;
};

const initialForm: CreateCategoryForm = {
  catCode: "",
  catName: "",
};

const fieldBaseClass =
  "w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-800 shadow-sm outline-none transition focus:border-[#7A0000] focus:ring-2 focus:ring-[#7A0000]/10";

const buttonBaseClass =
  "rounded-lg px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";

const toTitleCase = (value: string) => {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  return trimmed
    .split(/\s+/)
    .map((word) =>
      word.length === 1
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join(" ");
};

const ReportCategory = () => {
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [selectedCatCode, setSelectedCatCode] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<CreateCategoryForm>(initialForm);
  const [mode, setMode] = useState<"add" | "edit">("add");

  const filteredCategories = useMemo(() => {
    const query = searchInput.trim().toUpperCase();

    if (!query) {
      return categories;
    }

    return categories.filter(
      (category) =>
        category.catCode.toUpperCase().includes(query) ||
        category.catName.toUpperCase().includes(query)
    );
  }, [categories, searchInput]);

  const loadCategories = async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/roleadminapi/api/reportcategory");
      const payload = await response.json();

      if (payload?.errorMessage) {
        throw new Error(payload.errorMessage);
      }

      const nextCategories: CategoryRecord[] = Array.isArray(payload?.data)
        ? payload.data.map((item: any) => ({
          catCode: item?.CatCode ?? "",
          catName: item?.CatName ?? "",
        }))
        : [];

      setCategories(nextCategories);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "FAILED TO LOAD CATEGORIES.";
      toast.error(message);
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();

    if (!form.catCode.trim() || !form.catName.trim()) {
      toast.error("CATEGORY CODE AND DESCRIPTION ARE REQUIRED.");
      return;
    }

    const normalizedCatCode = form.catCode.trim().toUpperCase();
    const normalizedCatName = toTitleCase(form.catName);

    setIsSubmitting(true);

    try {
      const response = await fetch("/roleadminapi/api/reportcategory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          catCode: normalizedCatCode,
          catName: normalizedCatName,
        }),
      });

      const payload = await response.json();

      if (payload?.errorMessage) {
        throw new Error(payload.errorMessage);
      }

      toast.success("CATEGORY ADDED SUCCESSFULLY.");
      setForm(initialForm);
      await loadCategories();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "FAILED TO ADD CATEGORY.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (e: FormEvent) => {
    e.preventDefault();

    if (!form.catCode.trim() || !form.catName.trim()) {
      toast.error("CATEGORY CODE AND DESCRIPTION ARE REQUIRED.");
      return;
    }

    const normalizedCatCode = form.catCode.trim().toUpperCase();
    const normalizedCatName = toTitleCase(form.catName);

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/roleadminapi/api/reportcategory/${encodeURIComponent(normalizedCatCode)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            catCode: normalizedCatCode,
            catName: normalizedCatName,
          }),
        }
      );

      const payload = await response.json();

      if (payload?.errorMessage) {
        throw new Error(payload.errorMessage);
      }

      if (payload?.data && !payload.data.success) {
        throw new Error(payload.data.message || "FAILED TO UPDATE CATEGORY.");
      }

      toast.success(payload?.data?.message || "CATEGORY UPDATED SUCCESSFULLY.");
      setForm(initialForm);
      setMode("add");
      setSelectedCatCode(null);
      await loadCategories();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "FAILED TO UPDATE CATEGORY.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCatCode) {
      toast.error("NO CATEGORY SELECTED FOR DELETION.");
      return;
    }

    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedCatCode) {
      toast.error("NO CATEGORY SELECTED FOR DELETION.");
      setIsDeleteModalOpen(false);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/roleadminapi/api/reportcategory/${encodeURIComponent(selectedCatCode)}`,
        {
          method: "DELETE",
        }
      );

      const payload = await response.json();

      if (payload?.errorMessage) {
        throw new Error(payload.errorMessage);
      }

      if (payload?.data && !payload.data.success) {
        throw new Error(payload.data.message || "FAILED TO DELETE CATEGORY.");
      }

      toast.success(payload?.data?.message || "CATEGORY DELETED SUCCESSFULLY.");
      setForm(initialForm);
      setMode("add");
      setSelectedCatCode(null);
      setIsDeleteModalOpen(false);
      await loadCategories();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "FAILED TO DELETE CATEGORY.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRowClick = (category: CategoryRecord) => {
    setSelectedCatCode(category.catCode);
    setForm({
      catCode: category.catCode,
      catName: toTitleCase(category.catName),
    });
    setMode("edit");
  };

  const handleReset = () => {
    setForm(initialForm);
    setMode("add");
    setSelectedCatCode(null);
  };

  useEffect(() => {
    loadCategories();
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(122,0,0,0.08),_transparent_35%),linear-gradient(180deg,_#faf7f2_0%,_#f3efe7_100%)] px-2 py-4 text-stone-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="grid gap-6 xl:grid-cols-[minmax(0,40%)_minmax(0,60%)] xl:items-start">
      {/* Right side: Form */}
      <div className="w-full bg-white rounded-3xl shadow-sm border border-stone-200 p-6 flex flex-col h-full xl:order-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-stone-900">Report Category Form</h2>
        </div>

        <div className="mt-4">
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-stone-600 mb-1">
              Add / Edit / Delete Report Category
            </h3>
          </div>

          <form
            onSubmit={mode === "add" ? handleAdd : handleEdit}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                Category Code
              </label>
              <input
                type="text"
                className={fieldBaseClass}
                value={form.catCode}
                onChange={(e) =>
                  setForm({ ...form, catCode: e.target.value.toUpperCase() })
                }
                placeholder="e.g., WIP"
                disabled={mode === "edit"}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                Description
              </label>
              <input
                type="text"
                className={fieldBaseClass}
                value={form.catName}
                onChange={(e) => setForm({ ...form, catName: e.target.value })}
                onBlur={(e) =>
                  setForm({ ...form, catName: toTitleCase(e.target.value) })
                }
                placeholder="e.g., Work In Progress"
              />
            </div>

            <div className="flex flex-wrap gap-3 pt-4">
              <button
                type={mode === "add" ? "submit" : "button"}
                onClick={mode === "add" ? undefined : handleAdd}
                className={`${buttonBaseClass} bg-[#7A0000] text-white hover:bg-[#620000]`}
                disabled={isSubmitting}
              >
                ADD
              </button>

              <button
                type={mode === "edit" ? "submit" : "button"}
                onClick={
                  mode === "edit"
                    ? undefined
                    : () => {
                      if (selectedCatCode) setMode("edit");
                      else toast.error("SELECT A CATEGORY TO EDIT.");
                    }
                }
                className={`${buttonBaseClass} bg-[#7A0000]/85 text-white hover:bg-[#620000]`}
                disabled={isSubmitting}
              >
                EDIT
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className={`${buttonBaseClass} bg-stone-800 text-white hover:bg-black`}
                disabled={isSubmitting || !selectedCatCode}
              >
                DELETE
              </button>

              <button
                type="button"
                onClick={handleReset}
                className={`${buttonBaseClass} border border-[#7A0000]/20 bg-white text-[#7A0000] hover:bg-[#7A0000]/5`}
              >
                RESET
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Left side: Table */}
      <div className="w-full bg-white rounded-3xl shadow-sm border border-stone-200 p-6 flex flex-col h-full xl:order-2">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-stone-900">Report Category Table</h2>
          <button
            type="button"
            onClick={loadCategories}
            className="flex items-center gap-2 text-xs font-medium text-[#7A0000] border border-[#7A0000]/20 rounded-full px-3 py-1.5 hover:bg-[#7A0000]/5 transition-colors"
          >
            <RefreshCw
              className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        <div className="mb-4 space-y-2">
          <div className="flex gap-3">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search category code or name"
              className="flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 shadow-sm outline-none transition focus:border-[#7A0000] focus:ring-2 focus:ring-[#7A0000]/10"
            />
            <button
              type="button"
              onClick={() => setSearchInput("")}
              className="inline-flex items-center gap-2 rounded-lg border border-[#7A0000]/20 bg-white px-4 py-2 text-sm font-semibold text-[#7A0000] transition hover:bg-[#7A0000]/5"
            >
              <Search className="h-4 w-4" />
              Clear
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden rounded-2xl border border-stone-200 bg-stone-50/40">
          <div className="max-h-[520px] overflow-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-stone-100 text-stone-500 text-xs uppercase tracking-[0.15em]">
                <tr>
                  <th className="px-4 py-2 border border-stone-200 w-1/3">
                    Category Code
                  </th>
                  <th className="px-4 py-2 border border-stone-200">
                    Category Name
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={2}
                      className="px-4 py-6 text-center text-stone-500 text-sm"
                    >
                      <RefreshCw className="inline w-4 h-4 animate-spin mr-2" />
                      LOADING CATEGORIES...
                    </td>
                  </tr>
                ) : filteredCategories.length > 0 ? (
                  filteredCategories.map((category) => (
                    <tr
                      key={category.catCode}
                      onClick={() => handleRowClick(category)}
                      className={`cursor-pointer transition-colors text-sm ${selectedCatCode === category.catCode
                          ? "bg-blue-50"
                          : "bg-white hover:bg-stone-50"
                        }`}
                    >
                      <td className="px-4 py-2 border border-stone-200 align-top">
                        {category.catCode}
                      </td>
                      <td className="px-4 py-2 border border-stone-200 align-top">
                        {category.catName}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={2}
                      className="px-4 py-6 text-center text-stone-500 text-sm"
                    >
                      {searchInput.trim()
                        ? "NO MATCHING CATEGORIES FOUND."
                        : "NO CATEGORIES FOUND."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
        </section>
      </div>

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/45 px-4">
          <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-stone-900">Delete Category</h3>
            <p className="mt-2 text-sm text-stone-600">
              Are you sure you want to delete
              <span className="mx-1 font-semibold text-stone-900">
                {selectedCatCode || "this category"}
              </span>
              ?
            </p>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-lg bg-[#7A0000] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#620000] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportCategory;
