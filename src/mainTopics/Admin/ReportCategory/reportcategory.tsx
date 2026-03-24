import { FormEvent, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { RefreshCw, Trash2, Edit2, Plus } from "lucide-react";

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
  "px-4 py-2 font-semibold text-white rounded-md transition-all duration-200 cursor-pointer hover:opacity-90 active:scale-95";

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

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();

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

  const handleEdit = async (e: FormEvent) => {
    e.preventDefault();

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

    if (!window.confirm(`Delete category: ${selectedCatCode}?`)) {
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-4 py-6">
      {/* Left side: Form */}
      <div className="bg-white rounded-3xl shadow-sm border border-stone-200 p-6 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-stone-800">Report Category</h2>
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
                onChange={(e) => setForm({ ...form, catCode: e.target.value })}
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
                placeholder="e.g., Work In Progress"
              />
            </div>

            <div className="flex flex-wrap gap-3 pt-4">
              <button
                type={mode === "add" ? "submit" : "button"}
                onClick={mode === "add" ? undefined : handleAdd}
                className={`${buttonBaseClass} bg-[#7A0000] hover:bg-[#620000] flex items-center gap-2`}
                disabled={isSubmitting}
              >
                <Plus className="w-4 h-4" />
                ADD
              </button>

              <button
                type={mode === "edit" ? "submit" : "button"}
                onClick={
                  mode === "edit"
                    ? undefined
                    : () => {
                      if (selectedCatCode) setMode("edit");
                      else toast.error("Select a category to edit");
                    }
                }
                className={`${buttonBaseClass} bg-[#7A0000] hover:bg-[#620000] flex items-center gap-2`}
                disabled={isSubmitting}
              >
                <Edit2 className="w-4 h-4" />
                EDIT
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className={`${buttonBaseClass} bg-[#7A0000] hover:bg-[#620000] flex items-center gap-2`}
                disabled={isSubmitting || !selectedCatCode}
              >
                <Trash2 className="w-4 h-4" />
                DELETE
              </button>

              <button
                type="button"
                onClick={handleReset}
                className={`${buttonBaseClass} bg-[#7A0000] hover:bg-[#620000]`}
              >
                RESET
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Right side: Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-stone-200 p-6 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-stone-800">Report Category List</h2>
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

        <div className="flex-1 overflow-hidden rounded-2xl border border-stone-200 bg-stone-50/60">
          <div className="max-h-[520px] overflow-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-[#E6E6FA] text-stone-800 text-xs uppercase tracking-wide">
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
                      Loading categories...
                    </td>
                  </tr>
                ) : categories.length > 0 ? (
                  categories.map((category) => (
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
                      No categories found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportCategory;
