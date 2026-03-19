import { FormEvent, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { RefreshCw } from "lucide-react";

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
  "w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-800 shadow-sm outline-none transition focus:border-[#7A0000] focus:ring-2 focus:ring-[#7A0000]/10 disabled:bg-stone-100 disabled:text-stone-500";

const ReportCategory = () => {
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [selectedCatCode, setSelectedCatCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<CreateCategoryForm>(initialForm);
  const [mode, setMode] = useState<"add" | "edit">("add");

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
        error instanceof Error ? error.message : "Failed to load categories.";
      toast.error(message);
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async (e?: FormEvent) => {
    if (e) e.preventDefault();

    if (!form.catCode.trim() || !form.catName.trim()) {
      toast.error("Category Code and Description are required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/roleadminapi/api/reportcategory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          catCode: form.catCode.trim(),
          catName: form.catName.trim(),
        }),
      });

      const payload = await response.json();

      if (payload?.errorMessage) {
        throw new Error(payload.errorMessage);
      }

      toast.success("Category added successfully.");
      setForm(initialForm);
      await loadCategories();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to add category.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (e?: FormEvent) => {
    if (e) e.preventDefault();

    if (!form.catCode.trim() || !form.catName.trim()) {
      toast.error("Category Code and Description are required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/roleadminapi/api/reportcategory/${encodeURIComponent(form.catCode.trim())}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            catCode: form.catCode.trim(),
            catName: form.catName.trim(),
          }),
        }
      );

      const payload = await response.json();

      if (payload?.errorMessage) {
        throw new Error(payload.errorMessage);
      }

      if (payload?.data && !payload.data.success) {
        throw new Error(payload.data.message || "Failed to update category.");
      }

      toast.success(payload?.data?.message || "Category updated successfully.");
      setForm(initialForm);
      setMode("add");
      setSelectedCatCode(null);
      await loadCategories();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update category.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCatCode) {
      toast.error("No category selected for deletion.");
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
        throw new Error(payload.data.message || "Failed to delete category.");
      }

      toast.success(payload?.data?.message || "Category deleted successfully.");
      setForm(initialForm);
      setMode("add");
      setSelectedCatCode(null);
      await loadCategories();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete category.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRowClick = (category: CategoryRecord) => {
    setSelectedCatCode(category.catCode);
    setForm({
      catCode: category.catCode,
      catName: category.catName,
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

  const selectedCategoryObj = categories.find((c) => c.catCode === selectedCatCode) ?? null;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(122,0,0,0.08),_transparent_35%),linear-gradient(180deg,_#faf7f2_0%,_#f3efe7_100%)] px-2 py-4 text-stone-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="grid gap-6 xl:grid-cols-[2fr_3fr]">
          {/* Left side: Form */}
          <form
            onSubmit={mode === "add" ? handleAdd : handleEdit}
            className="rounded-[28px] border border-[#7A0000]/10 bg-white p-6 shadow-[0_16px_50px_rgba(122,0,0,0.08)] h-fit"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-stone-900">Report Category Form</h2>
                <div className="mt-1 text-sm text-stone-500">Add / Edit / Delete Report Category</div>
              </div>
            </div>

            <div className="mt-6 space-y-6">
              <div className="grid gap-4">
                <Input
                  label="Category Code"
                  value={form.catCode}
                  onChange={(value) => setForm({ ...form, catCode: value })}
                  placeholder="e.g., WIP"
                  disabled={mode === "edit"}
                />
                <Input
                  label="Description"
                  value={form.catName}
                  onChange={(value) => setForm({ ...form, catName: value })}
                  placeholder="e.g., Work In Progress"
                />
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type={mode === "add" ? "submit" : "button"}
                onClick={mode === "add" ? undefined : () => handleAdd()}
                disabled={isSubmitting}
                className="rounded-lg bg-[#7A0000] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#620000] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting && mode === "add" ? "Saving..." : "ADD"}
              </button>
              <button
                type={mode === "edit" ? "submit" : "button"}
                disabled={isSubmitting}
                onClick={
                  mode === "edit"
                    ? undefined
                    : () => {
                      if (selectedCatCode) setMode("edit");
                      else toast.error("Select a category to edit");
                    }
                }
                className="rounded-lg bg-[#7A0000]/85 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#620000] disabled:cursor-not-allowed disabled:opacity-50"
              >
                EDIT
              </button>
              <button
                type="button"
                disabled={!selectedCatCode || isSubmitting}
                onClick={handleDelete}
                className="rounded-lg bg-stone-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                DELETE
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-lg border border-[#7A0000]/20 bg-white px-5 py-2.5 text-sm font-semibold text-[#7A0000] transition hover:bg-[#7A0000]/5"
              >
                RESET
              </button>
            </div>
          </form>

          {/* Right side: Table */}
          <section className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-[0_16px_50px_rgba(70,40,20,0.06)] flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-stone-900">Category Directory</h2>
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

            <div className="mt-6 overflow-hidden rounded-2xl border border-stone-200 flex-1 flex flex-col">
              <div className="overflow-x-auto flex-1 max-h-[500px]">
                <table className="min-w-full divide-y divide-stone-200 text-sm">
                  <thead className="bg-stone-100 text-center text-xs uppercase tracking-[0.2em] text-stone-500 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 border-b border-stone-200">Category Code</th>
                      <th className="px-4 py-3 border-b border-stone-200">Category Name</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 bg-white">
                    {isLoading ? (
                      <tr>
                        <td colSpan={2} className="px-4 py-10 text-center text-stone-500">
                          Loading categories...
                        </td>
                      </tr>
                    ) : categories.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-4 py-10 text-center text-stone-500">
                          No categories found.
                        </td>
                      </tr>
                    ) : (
                      categories.map((category) => {
                        const isSelected = selectedCatCode === category.catCode;

                        return (
                          <tr
                            key={category.catCode}
                            onClick={() => handleRowClick(category)}
                            className={`cursor-pointer transition ${isSelected ? "bg-[#7A0000]/8" : "hover:bg-stone-50"
                              }`}
                          >
                            <td className="px-4 py-3 font-semibold text-stone-900 text-center">{category.catCode || "-"}</td>
                            <td className="px-4 py-3 text-center">{category.catName || "-"}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-stone-600">
              {selectedCategoryObj ? (
                <div className="grid gap-1 md:grid-cols-2">
                  <div>
                    <span className="font-semibold text-stone-800">Selected Category:</span> {selectedCategoryObj.catCode.trim()}
                  </div>
                  <div>
                    <span className="font-semibold text-stone-800">Description:</span> {selectedCategoryObj.catName.trim() || "-"}
                  </div>
                </div>
              ) : (
                <span>Select a row to prepare future edit or delete actions.</span>
              )}
            </div>
          </section>
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

export default ReportCategory;
