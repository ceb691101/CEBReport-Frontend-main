import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  RefreshCw,
  Folder,
  CircleChevronRight,
  Search,
} from "lucide-react";

type ViewMode = "category" | "name";

type RoleRecord = {
  roleId: string;
  roleName: string;
  epfNo: string;
  userType: string;
  company: string;
};

type CategoryRecord = {
  catCode: string;
  catName: string;
};

type ReportRecord = {
  repId: string;
  catCode: string;
  catName?: string;
  repName: string;
  active: number;
};

type RoleReportMap = Record<string, string[]>;

const fieldBaseClass =
  "w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-800 shadow-sm outline-none transition focus:border-[#7A0000] focus:ring-2 focus:ring-[#7A0000]/10";

const normalizeText = (value: unknown): string =>
  (value ?? "").toString().trim();

const normalizeKey = (value: unknown): string =>
  normalizeText(value).toUpperCase();

const RoleReport = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("category");
  const [reportSearch, setReportSearch] = useState<string>("");
  const [roleSearch, setRoleSearch] = useState<string>("");
  const [activeRoleTab, setActiveRoleTab] = useState<"user" | "admin">("user");
  const [currentPage, setCurrentPage] = useState(1);
  const rolesPerPage = 10;

  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);

  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedReports, setSelectedReports] = useState<string[]>([]);

  const [enteredName, setEnteredName] = useState<string>("");
  const [enteredUserName, setEnteredUserName] = useState<string>("");

  const [, setRoleReportMap] = useState<RoleReportMap>({});

  const [isRolesLoading, setIsRolesLoading] = useState(false);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(false);
  const [isReportsLoading, setIsReportsLoading] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const fetchRoleData = async (type: "USER" | "ADMIN") => {
    const endpointCandidates = [
      `/roleadminapi/api/roleinfo/${type}`,
      `/roleadminapi/api/roleinfo/${type.toLowerCase()}`,
    ];

    let payload: any = null;
    let lastError: Error | null = null;

    for (const endpoint of endpointCandidates) {
      try {
        const response = await fetch(endpoint);

        if (!response.ok) {
          throw new Error(`Failed to load ${type} roles. (${response.status})`);
        }

        const nextPayload = await response.json();

        if (nextPayload?.errorMessage) {
          throw new Error(nextPayload.errorMessage);
        }

        payload = nextPayload;
        break;
      } catch (error) {
        lastError =
          error instanceof Error
            ? error
            : new Error(`Failed to load ${type} roles.`);
      }
    }

    if (!payload) {
      throw lastError ?? new Error(`Failed to load ${type} roles.`);
    }

    const items = Array.isArray(payload?.data) ? payload.data : [];

    return items.map((item: any) => ({
      roleId: item?.RoleId ?? item?.roleId ?? "",
      roleName: item?.RoleName ?? item?.roleName ?? "",
      epfNo:
        item?.EpfNo ??
        item?.epfNo ??
        item?.EPFNo ??
        item?.epfno ??
        item?.UserNo ??
        item?.userNo ??
        "",
      userType: item?.UserType ?? item?.userType ?? "",
      company: item?.Company ?? item?.company ?? "",
    })) as RoleRecord[];
  };

  const loadRoles = async () => {
    setIsRolesLoading(true);

    try {
      const [users, admins] = await Promise.all([
        fetchRoleData("USER"),
        fetchRoleData("ADMIN"),
      ]);

      const merged = [...users, ...admins].filter((role, index, arr) => {
        return (
          arr.findIndex((r) => normalizeKey(r.roleId) === normalizeKey(role.roleId)) ===
          index
        );
      });

      setRoles(merged);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load roles.";
      toast.error(message);
      setRoles([]);
    } finally {
      setIsRolesLoading(false);
    }
  };

  const loadCategories = async () => {
    setIsCategoriesLoading(true);

    try {
      const response = await fetch("/roleadminapi/api/reportcategory");

      if (!response.ok) {
        throw new Error(`Failed to load categories. (${response.status})`);
      }

      const payload = await response.json();

      if (payload?.errorMessage) {
        throw new Error(payload.errorMessage);
      }

      const items = Array.isArray(payload?.data) ? payload.data : [];
      setCategories(
        items.map((item: any) => ({
          catCode: item?.CatCode ?? item?.catCode ?? "",
          catName: item?.CatName ?? item?.catName ?? "",
        }))
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load categories.";
      toast.error(message);
      setCategories([]);
    } finally {
      setIsCategoriesLoading(false);
    }
  };

  const loadReports = async () => {
    setIsReportsLoading(true);

    try {
      const response = await fetch("/roleadminapi/api/reportentry");

      if (!response.ok) {
        throw new Error(`Failed to load reports. (${response.status})`);
      }

      const payload = await response.json();

      if (payload?.errorMessage) {
        throw new Error(payload.errorMessage);
      }

      const items = Array.isArray(payload?.data) ? payload.data : [];
      setReports(
        items.map((item: any) => ({
          repId: item?.RepId ?? item?.repId ?? "",
          catCode: item?.CatCode ?? item?.catCode ?? "",
          catName: item?.CatName ?? item?.catName ?? "",
          repName: item?.RepName ?? item?.repName ?? "",
          active: Number(item?.Active ?? item?.active ?? 0),
        }))
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load reports.";
      toast.error(message);
      setReports([]);
    } finally {
      setIsReportsLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  useEffect(() => {
    loadCategories();
    loadReports();
  }, []);

  const selectedRole = useMemo(
    () =>
      roles.find((role) => normalizeKey(role.roleId) === normalizeKey(selectedRoleId)) ??
      null,
    [roles, selectedRoleId]
  );

  const filteredRoles = useMemo(() => {
    let result = roles.filter(role => {
      const type = normalizeKey(role.userType) === "ADMIN" ? "admin" : "user";
      return type === activeRoleTab;
    });

    const query = normalizeText(roleSearch).toUpperCase();

    if (query) {
      result = result.filter((role) => {
        const haystack = [role.epfNo, role.roleId, role.roleName]
          .map((item) => normalizeText(item).toUpperCase())
          .join(" ");

        return haystack.includes(query);
      });
    }

    return result;
  }, [roles, roleSearch, activeRoleTab]);

  const totalPages = Math.max(1, Math.ceil(filteredRoles.length / rolesPerPage));
  const paginatedRoles = filteredRoles.slice((currentPage - 1) * rolesPerPage, currentPage * rolesPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [roleSearch, activeRoleTab]);

  const changePage = (page: number) => {
    if (page < 1 || page > totalPages) {
      return;
    }
    setCurrentPage(page);
  };

  useEffect(() => {
    setEnteredName(selectedRole?.roleName ?? "");
    setEnteredUserName(selectedRole?.roleId ?? "");

    if (!selectedRole?.roleId) {
      setSelectedCategories([]);
      setSelectedReports([]);
      return;
    }

    const loadAssignedReports = async () => {
      try {
        const response = await fetch(`/roleadminapi/api/role-report/user/${encodeURIComponent(selectedRole.roleId)}/reports`);
        if (response.ok) {
          const payload = await response.json();
          const items = Array.isArray(payload?.data) ? payload.data : [];
          const repIds = items.map((item: any) => item?.repId ?? item?.RepId ?? "").filter(Boolean);
          const catCodes = items.map((item: any) => item?.catCode ?? item?.CatCode ?? "").filter(Boolean);
          
          setSelectedReports(repIds);
          setSelectedCategories(Array.from(new Set(catCodes)) as string[]);
        }
      } catch (error) {
        console.error("Failed to load assigned reports", error);
      }
    };

    loadAssignedReports();
  }, [selectedRole]);

  const activeReports = useMemo(
    () => reports.filter((report) => report.active === 1),
    [reports]
  );

  const categoryNameByCode = useMemo(() => {
    return categories.reduce<Record<string, string>>((acc, category) => {
      acc[normalizeKey(category.catCode)] = category.catName;
      return acc;
    }, {});
  }, [categories]);

  const reportsByCategory = useMemo(() => {
    return selectedCategories.flatMap((catCode) =>
      activeReports
        .filter((report) => normalizeKey(report.catCode) === normalizeKey(catCode))
        .map((report) => report.repId)
    );
  }, [activeReports, selectedCategories]);

  const reportsByName = useMemo(() => {
    return activeReports.map((report) => ({
      ...report,
      catName: report.catName || categoryNameByCode[normalizeKey(report.catCode)] || "",
    }));
  }, [activeReports, categoryNameByCode]);

  const reportsByNameGrouped = useMemo(() => {
    const query = normalizeText(reportSearch).toUpperCase();
    const searchableReports = query
      ? reportsByName.filter((report) => {
          const haystack = [
            report.repId,
            report.repName,
            report.catCode,
            report.catName,
          ]
            .map((item) => normalizeText(item).toUpperCase())
            .join(" ");

          return haystack.includes(query);
        })
      : reportsByName;

    const groups = searchableReports.reduce<Record<string, ReportRecord[]>>((acc, report) => {
      const key = normalizeKey(report.catCode) || "UNCATEGORIZED";
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(report);
      return acc;
    }, {});

    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([catCode, groupReports]) => ({
        catCode,
        catName: groupReports[0]?.catName || categoryNameByCode[catCode] || "",
        reports: groupReports.sort((a, b) => a.repId.localeCompare(b.repId)),
      }));
  }, [reportsByName, categoryNameByCode, reportSearch]);

  const selectedRepIdsForAction = useMemo(() => {
    if (viewMode === "category") {
      return Array.from(new Set(reportsByCategory));
    }

    return Array.from(new Set(selectedReports));
  }, [viewMode, reportsByCategory, selectedReports]);

  const allCategoryCodes = useMemo(
    () => Array.from(new Set(categories.map((category) => category.catCode).filter(Boolean))),
    [categories]
  );

  const allReportIds = useMemo(
    () => Array.from(new Set(activeReports.map((report) => report.repId).filter(Boolean))),
    [activeReports]
  );

  const toggleCategory = (catCode: string) => {
    setSelectedCategories((current) =>
      current.some((code) => normalizeKey(code) === normalizeKey(catCode))
        ? current.filter((code) => normalizeKey(code) !== normalizeKey(catCode))
        : [...current, catCode]
    );
  };

  const toggleReport = (repId: string) => {
    setSelectedReports((current) =>
      current.some((id) => normalizeKey(id) === normalizeKey(repId))
        ? current.filter((id) => normalizeKey(id) !== normalizeKey(repId))
        : [...current, repId]
    );
  };

  const selectAllForCurrentMode = () => {
    if (viewMode === "category") {
      setSelectedCategories(allCategoryCodes);
      return;
    }

    setSelectedReports(allReportIds);
  };

  const invertSelectionForCurrentMode = () => {
    if (viewMode === "category") {
      setSelectedCategories((current) =>
        allCategoryCodes.filter(
          (catCode) => !current.some((item) => normalizeKey(item) === normalizeKey(catCode))
        )
      );
      return;
    }

    setSelectedReports((current) =>
      allReportIds.filter(
        (repId) => !current.some((item) => normalizeKey(item) === normalizeKey(repId))
      )
    );
  };

  const clearSelectionForCurrentMode = () => {
    if (viewMode === "category") {
      setSelectedCategories([]);
      return;
    }

    setSelectedReports([]);
  };

  const runAction = async (mode: "add" | "replace" | "remove") => {
    if (!selectedRoleId) {
      toast.error("Select a user role first.");
      return;
    }

    let targetRepIdsForAction = selectedRepIdsForAction;

    if (targetRepIdsForAction.length === 0) {
      // try fallback: derive report ids from selected categories directly
      const fallbackFromCategories = selectedCategories.length
        ? activeReports
            .filter((report) =>
              selectedCategories.some(
                (sc) => normalizeKey(report.catCode) === normalizeKey(sc)
              )
            )
            .map((r) => r.repId)
        : [];

      if (fallbackFromCategories.length > 0) {
        targetRepIdsForAction = Array.from(new Set(fallbackFromCategories));
      } else {
        toast.error(`Select at least one report or category. (selectedCategories=${selectedCategories.length}, selectedReports=${selectedReports.length})`);
        return;
      }
    }

    setIsBusy(true);

    try {
      // debug log: selection state
      // eslint-disable-next-line no-console
      console.log("runAction", { selectedRoleId, viewMode, selectedCategories, selectedReports, targetRepIdsForAction });
      // build payload for selected report ids
      const reportsPayload = targetRepIdsForAction.map((repId) => {
        const rep = reports.find((r) => normalizeKey(r.repId) === normalizeKey(repId));
        return {
          CatCode: rep?.catCode ?? "",
          RepId: repId,
          Favorite: 0,
        };
      });

      // Replace: delete existing then insert
      if (mode === "replace") {
        const deleteAllResp = await fetch(`/roleadminapi/api/role-report/user/${encodeURIComponent(selectedRoleId)}/reports`, {
          method: "DELETE",
        });
        const deleteAllPayload = await deleteAllResp.json();
        if (deleteAllPayload?.errorMessage) {
          throw new Error(deleteAllPayload.errorDetails ? `${deleteAllPayload.errorMessage} Details: ${deleteAllPayload.errorDetails}` : deleteAllPayload.errorMessage);
        }

        const resp = await fetch(`/roleadminapi/api/role-report/save-userrolereps`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ RoleId: selectedRoleId, Reports: reportsPayload }),
        });

        const payload = await resp.json();
        if (payload?.errorMessage) {
          throw new Error(payload.errorDetails ? `${payload.errorMessage} Details: ${payload.errorDetails}` : payload.errorMessage);
        }

        setRoleReportMap((current) => ({ ...current, [selectedRoleId]: reportsPayload.map((r) => r.RepId) }));
        toast.success("Role report list updated.");
        return;
      }

      // Add: save new reports (backend avoids duplicates)
      if (mode === "add") {
        const resp = await fetch(`/roleadminapi/api/role-report/save-userrolereps`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ RoleId: selectedRoleId, Reports: reportsPayload }),
        });

        const payload = await resp.json();
        if (payload?.errorMessage) {
          throw new Error(payload.errorDetails ? `${payload.errorMessage} Details: ${payload.errorDetails}` : payload.errorMessage);
        }

        setRoleReportMap((current) => {
          const existing = current[selectedRoleId] ?? [];
          const next = Array.from(new Set([...existing, ...reportsPayload.map((r) => r.RepId)]));
          return { ...current, [selectedRoleId]: next };
        });

        toast.success("Reports added to selected role.");
        return;
      }

      // Remove: delete by selected category or selected report names.
      if (mode === "remove") {
        let totalDeletedRows = 0;

        if (viewMode === "category" && selectedCategories.length > 0) {
          for (const catCode of selectedCategories) {
            const resp = await fetch(`/roleadminapi/api/role-report/user/${encodeURIComponent(selectedRoleId)}/reports/category/${encodeURIComponent(catCode)}`, {
              method: "DELETE",
            });

            const payload = await resp.json();
            if (payload?.errorMessage) {
              throw new Error(payload.errorDetails ? `${payload.errorMessage} Details: ${payload.errorDetails}` : payload.errorMessage);
            }

            totalDeletedRows += Number(payload?.data?.deletedRows ?? 0);
          }
        } else {
          for (const repId of targetRepIdsForAction) {
            const resp = await fetch(`/roleadminapi/api/role-report/user/${encodeURIComponent(selectedRoleId)}/reports/${encodeURIComponent(repId)}`, {
              method: "DELETE",
            });

            const payload = await resp.json();
            if (payload?.errorMessage) {
              throw new Error(payload.errorDetails ? `${payload.errorMessage} Details: ${payload.errorDetails}` : payload.errorMessage);
            }

            totalDeletedRows += Number(payload?.data?.deletedRows ?? 0);
          }
        }

        if (totalDeletedRows === 0) {
          toast.info("No matching reports were deleted for this role.");
          return;
        }

        setRoleReportMap((current) => {
          const existing = current[selectedRoleId] ?? [];
          const next = existing.filter(
            (repId) =>
              !targetRepIdsForAction.some(
                (targetRepId) => normalizeKey(targetRepId) === normalizeKey(repId)
              )
          );
          return { ...current, [selectedRoleId]: next };
        });

        toast.success("Selected reports removed from role.");
        return;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Action failed.";
      toast.error(message);
    } finally {
      setIsBusy(false);
    }
  };

  const resetSelections = () => {
    setSelectedRoleId("");
    setEnteredName("");
    setEnteredUserName("");
    setSelectedCategories([]);
    setSelectedReports([]);
    setReportSearch("");
    setViewMode("category");
    toast.info("Selections reset.");
  };

  const handleDeleteClick = () => {
    if (!selectedRoleId) {
      toast.error("Select a user role first.");
      return;
    }

    if (selectedRepIdsForAction.length === 0) {
      toast.error("Select at least one report or category to delete.");
      return;
    }

    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    setIsDeleteConfirmOpen(false);
    await runAction("remove");
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#faf7f2_0%,_#f3efe7_100%)] px-2 py-4 text-stone-900">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,50%)_minmax(0,50%)] xl:items-stretch">
          <div className="flex h-full min-h-[78vh] w-full flex-col rounded-[26px] border border-[#7A0000]/12 bg-white p-5 shadow-[0_12px_34px_rgba(122,0,0,0.08)] xl:order-2">
            <div className="mb-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-semibold text-stone-900">Role Report Table</h2>
                <button
                  type="button"
                  onClick={loadRoles}
                  className="inline-flex items-center gap-2 rounded-full border border-[#7A0000]/20 bg-white px-4 py-1.5 text-sm font-medium text-[#7A0000] transition hover:border-[#7A0000]/40 hover:bg-[#7A0000]/5"
                >
                  <RefreshCw className={`h-4 w-4 ${isRolesLoading ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>

              <div className="inline-flex rounded-full border border-stone-200 bg-stone-100 p-1">
                <TabButton
                  label="USER ROLES"
                  active={activeRoleTab === "user"}
                  onClick={() => setActiveRoleTab("user")}
                />
                <TabButton
                  label="ADMIN ROLES"
                  active={activeRoleTab === "admin"}
                  onClick={() => setActiveRoleTab("admin")}
                />
              </div>
            </div>

            <div className="mb-4 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <input
                  value={roleSearch}
                  onChange={(e) => setRoleSearch(e.target.value)}
                  placeholder="Search by EPF No, Role ID, or User Name"
                  className={`${fieldBaseClass} pl-10`}
                />
              </div>
              <button
                type="button"
                onClick={() => setRoleSearch("")}
                className="inline-flex items-center gap-2 rounded-xl border border-[#7A0000]/25 bg-white px-6 py-2 text-sm font-semibold text-[#7A0000] transition hover:bg-[#7A0000]/5"
              >
                <Search className="h-4 w-4" />
                Clear
              </button>
            </div>

            <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-stone-200">
              <div className="max-h-[calc(78vh-11rem)] overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-stone-100 text-xs uppercase tracking-[0.15em] text-stone-500">
                    <tr>
                      <th className="px-3 py-2">EPF No</th>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">User Name</th>
                      <th className="px-3 py-2">User Type</th>
                      <th className="px-3 py-2">Company Name</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isRolesLoading ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-stone-500">
                          Loading report users...
                        </td>
                      </tr>
                    ) : filteredRoles.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-stone-500">
                          No users found.
                        </td>
                      </tr>
                    ) : (
                      paginatedRoles.map((role) => {
                        return (
                          <tr
                            key={role.roleId}
                            onClick={() => setSelectedRoleId(role.roleId)}
                            className={`cursor-pointer border-t border-stone-100 transition ${
                              normalizeKey(selectedRoleId) === normalizeKey(role.roleId)
                                ? "bg-[#7A0000]/8"
                                : "bg-white hover:bg-stone-50"
                            }`}
                          >
                            <td className="px-3 py-2 text-stone-700">{role.epfNo || "-"}</td>
                            <td className="px-3 py-2 font-semibold text-stone-800">{role.roleName || "-"}</td>
                            <td className="px-3 py-2 text-stone-700">{role.roleId || "-"}</td>
                            <td className="px-3 py-2 text-stone-700">{normalizeKey(role.userType) === "ADMIN" ? "ADMIN" : "USER"}</td>
                            <td className="px-3 py-2 text-stone-600">{role.company || "-"}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {filteredRoles.length > 0 && (
              <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                <div className="text-stone-600">
                  Page {currentPage} of {totalPages} ({filteredRoles.length} shown)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => changePage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="rounded-md border border-stone-300 px-3 py-1.5 text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => changePage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="rounded-md border border-stone-300 px-3 py-1.5 text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-600">
              Selected: <span className="font-semibold text-stone-800">{selectedRole?.roleName || "None"}</span>
              {selectedRole ? (
                <>
                  {" "}
                  <span>
                    ({selectedRole.roleId}) - {normalizeKey(selectedRole.userType) === "ADMIN" ? "ADMIN" : "USER"}
                  </span>
                </>
              ) : (
                ""
              )}
            </div>
          </div>

          <div className="flex h-full min-h-[78vh] w-full flex-col space-y-5 xl:order-1">
            <div className="flex h-full flex-col rounded-[26px] border border-[#7A0000]/12 bg-white p-5 shadow-[0_12px_34px_rgba(122,0,0,0.08)]">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-stone-900">Role Report Form</h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    loadCategories();
                    loadReports();
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-[#7A0000]/20 px-4 py-2 text-sm font-medium text-[#7A0000] transition hover:border-[#7A0000]/40 hover:bg-[#7A0000]/5"
                >
                  <RefreshCw className={`h-4 w-4 ${isCategoriesLoading || isReportsLoading ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>
              <fieldset className="flex flex-1 flex-col rounded-2xl border border-stone-300 px-3 pb-4 pt-2">
                <legend className="px-2 text-sm font-semibold text-stone-800"></legend>

                <div className="grid flex-1 gap-3 pt-1">
                  <div className="grid items-center gap-2 sm:grid-cols-[80px_16px_1fr]">
                    <label className="text-sm font-medium text-stone-800">Name</label>
                    <span className="text-sm text-stone-500">:</span>
                    <input
                      value={enteredName}
                      onChange={(e) => setEnteredName(e.target.value)}
                      placeholder="Select from table or type a name"
                      className={fieldBaseClass}
                    />
                  </div>

                  <div className="grid items-center gap-2 sm:grid-cols-[80px_16px_1fr]">
                    <label className="text-sm font-medium text-stone-800">User Name</label>
                    <span className="text-sm text-stone-500">:</span>
                    <input
                      value={enteredUserName}
                      onChange={(e) => setEnteredUserName(e.target.value)}
                      placeholder="Select from table or type a username"
                      className={fieldBaseClass}
                    />
                  </div>

                  <div className="grid gap-2 sm:grid-cols-[80px_16px_1fr] sm:items-start">
                    <label className="pt-2 text-sm font-medium text-stone-800">Add Reports</label>
                    <span className="pt-2 text-sm text-stone-500">:</span>

                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-4">
                        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-stone-800">
                          <input
                            type="radio"
                            name="report-mode"
                            checked={viewMode === "category"}
                            onChange={() => setViewMode("category")}
                            className="h-4 w-4 border-stone-300 text-[#7A0000] focus:ring-[#7A0000]"
                          />
                          By Category
                        </label>

                        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-stone-800">
                          <input
                            type="radio"
                            name="report-mode"
                            checked={viewMode === "name"}
                            onChange={() => setViewMode("name")}
                            className="h-4 w-4 border-stone-300 text-[#7A0000] focus:ring-[#7A0000]"
                          />
                          By Name
                        </label>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={selectAllForCurrentMode}
                          className="rounded border border-stone-300 bg-white px-2.5 py-1 text-xs text-stone-700 hover:bg-stone-100"
                        >
                          select all
                        </button>
                        <button
                          type="button"
                          onClick={invertSelectionForCurrentMode}
                          className="rounded border border-stone-300 bg-white px-2.5 py-1 text-xs text-stone-700 hover:bg-stone-100"
                        >
                          invert selection
                        </button>
                        <button
                          type="button"
                          onClick={clearSelectionForCurrentMode}
                          className="rounded border border-stone-300 bg-white px-2.5 py-1 text-xs text-stone-700 hover:bg-stone-100"
                        >
                          select none
                        </button>
                      </div>

                      {viewMode === "category" ? (
                        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3">
                          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-stone-600">
                            <span>Categories</span>
                            <span>{selectedCategories.length} selected</span>
                          </div>
                          {isCategoriesLoading ? (
                            <div className="text-sm text-stone-500">Loading categories...</div>
                          ) : categories.length === 0 ? (
                            <div className="text-sm text-stone-500">No categories found.</div>
                          ) : (
                            <div className="grid max-h-[240px] grid-cols-1 gap-2 overflow-auto pr-1">
                              {categories.map((category) => (
                                <label key={category.catCode} className="flex items-start gap-2 rounded-lg bg-white px-2.5 py-2 text-sm text-stone-700">
                                  <input
                                    type="checkbox"
                                    checked={selectedCategories.some((code) => normalizeKey(code) === normalizeKey(category.catCode))}
                                    onChange={() => toggleCategory(category.catCode)}
                                    className="mt-0.5 h-4 w-4 rounded border-stone-300 text-[#7A0000] focus:ring-[#7A0000]"
                                  />
                                  <span>
                                    <strong>{category.catCode}</strong> - {category.catName}
                                  </span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3 rounded-2xl border border-stone-200 bg-stone-50 p-3">
                          <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                            <input
                              value={reportSearch}
                              onChange={(e) => setReportSearch(e.target.value)}
                              placeholder="Search report id, name, or category"
                              className={`${fieldBaseClass} pl-10`}
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs font-semibold text-stone-600">
                            <span>Reports</span>
                            <span>
                              {reportsByNameGrouped.reduce((total, group) => total + group.reports.length, 0)} shown, {selectedReports.length} selected
                            </span>
                          </div>
                          <div className="max-h-[320px] space-y-3 overflow-auto pr-1">
                            {reportsByNameGrouped.map((group) => (
                              <div key={group.catCode}>
                                <div className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-stone-800">
                                  <Folder className="h-4 w-4 text-amber-500" />
                                  <span>{group.catName ? `${group.catCode} - ${group.catName}` : group.catCode}</span>
                                </div>
                                <div className="space-y-1.5 pl-6">
                                  {group.reports.map((report) => (
                                    <label key={`${group.catCode}-${report.repId}`} className="flex items-start gap-2 rounded-md px-1 py-0.5 text-sm text-stone-700">
                                      <CircleChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                                      <input
                                        type="checkbox"
                                        checked={selectedReports.some((id) => normalizeKey(id) === normalizeKey(report.repId))}
                                        onChange={() => toggleReport(report.repId)}
                                        className="mt-0.5 h-4 w-4 rounded border-stone-300 text-[#7A0000] focus:ring-[#7A0000]"
                                      />
                                      <span>
                                        <strong>{report.repId}</strong>. {report.repName}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            ))}
                            {reportsByNameGrouped.length === 0 && (
                              <div className="text-sm text-stone-500">No reports match your search.</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </fieldset>

              <div className="mt-4 flex flex-wrap gap-2">
                <ActionButton
                  label="ADD"
                  onClick={() => runAction("add")}
                  disabled={isBusy}
                  tone="primary"
                />
                <ActionButton
                  label="EDIT"
                  onClick={() => runAction("replace")}
                  disabled={isBusy}
                  tone="primarySoft"
                />
                <ActionButton
                  label="DELETE"
                  onClick={handleDeleteClick}
                  disabled={isBusy}
                  tone="dark"
                />
                <ActionButton
                  label="RESET"
                  onClick={resetSelections}
                  disabled={isBusy}
                  tone="light"
                />
              </div>

              <p className="mt-3 text-xs text-stone-500">
                Selected for action: <span className="font-semibold text-stone-800">{selectedRepIdsForAction.length}</span> reports
              </p>
            </div>
          </div>
        </section>
      </div>

      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/45 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-stone-900">Confirm Delete</h3>
            <p className="mt-2 text-sm text-stone-600">
              This will remove selected report assignments from the chosen role.
            </p>

            <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
              <p>
                <span className="font-semibold text-stone-900">Role:</span>{" "}
                {selectedRole?.roleName || "-"} ({selectedRole?.roleId || "-"})
              </p>
              <p>
                <span className="font-semibold text-stone-900">Mode:</span>{" "}
                {viewMode === "category" ? "By Category" : "By Name"}
              </p>
              <p>
                <span className="font-semibold text-stone-900">Reports to remove:</span>{" "}
                {selectedRepIdsForAction.length}
              </p>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
                disabled={isBusy}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-lg bg-[#8E8E8E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#7A7A7A] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isBusy}
              >
                {isBusy ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ActionButton = ({
  label,
  onClick,
  disabled,
  tone,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  tone: "primary" | "primarySoft" | "dark" | "light";
}) => {
  const toneClasses: Record<typeof tone, string> = {
    primary: "bg-[#7A0000] text-white hover:bg-[#620000] disabled:opacity-60",
    primarySoft: "bg-[#7A0000]/85 text-white hover:bg-[#620000] disabled:opacity-50",
    dark: "bg-stone-800 text-white hover:bg-black disabled:opacity-50",
    light: "border border-[#7A0000]/20 bg-white text-[#7A0000] hover:bg-[#7A0000]/5 disabled:opacity-50",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed ${toneClasses[tone]}`}
    >
      {label}
    </button>
  );
};

const TabButton = ({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
      active ? "bg-[#7A0000] text-white shadow" : "text-stone-600 hover:text-stone-900"
    }`}
  >
    {label}
  </button>
);

export default RoleReport;
