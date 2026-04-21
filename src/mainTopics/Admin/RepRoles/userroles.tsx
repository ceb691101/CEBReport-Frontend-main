import { FormEvent, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { RefreshCw } from "lucide-react";

type RoleType = "admin" | "user";

type RoleRecord = {
	epfNo: string;
	roleId: string;
	roleName: string;
	company: string;
	motherCompany: string;
	userGroup: string;
	costCentre: string;
	costCentres: string[];
	userType: string;
};

type CreateRoleForm = {
	name: string;
	epfNo: string;
	roleId: string;
	userType: string;
	businessCompany: string;
	userGroup: string;
	motherCompany: string;
	costCentres: string[];
};

type MotherCompanyOption = {
	companyId: string;
	companyName: string;
};

type CostCentreOption = {
	costCentreId: string;
	costCentreName: string;
};

type UserGroupOption = {
	userGroupId: string;
	userGroupName: string;
};

const businessCompanyOptions = ["EDL", "NTNSP", "EGL", "NSO"];
const roleTypeOptions: Array<{ label: string; value: string; tab: RoleType }> = [
	{ label: "USER", value: "USER", tab: "user" },
	{ label: "ADMINISTRATOR", value: "ADMINISTRATOR", tab: "admin" },
];
const rolesPerPage = 10;

const initialForm: CreateRoleForm = {
	name: "",
	epfNo: "",
	roleId: "",
	userType: "USER",
	businessCompany: "EDL",
	userGroup: "",
	motherCompany: "",
	costCentres: [],
};

const endpointMap: Record<RoleType, string[]> = {
	admin: ["/roleadminapi/api/roleinfo/ADMIN", "/roleadminapi/api/roleinfo/admin"],
	user: ["/roleadminapi/api/roleinfo/USER", "/roleadminapi/api/roleinfo/user"],
};

const fieldBaseClass =
	"w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-800 shadow-sm outline-none transition focus:border-[#7A0000] focus:ring-2 focus:ring-[#7A0000]/10";

const normalizeText = (value: unknown): string =>
	(value ?? "").toString().trim();

const normalizeKey = (value: unknown): string =>
	normalizeText(value).toUpperCase();

const actionButtonPrimaryClass =
	"rounded-lg bg-[#7A0000] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#620000] disabled:cursor-not-allowed disabled:opacity-60";

const actionButtonSoftClass =
	"rounded-lg bg-[#7A0000]/85 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#620000] disabled:cursor-not-allowed disabled:opacity-50";

const actionButtonDarkClass =
	"rounded-lg bg-stone-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50";

const actionButtonLightClass =
	"rounded-lg border border-[#7A0000]/20 bg-white px-5 py-2.5 text-sm font-semibold text-[#7A0000] transition hover:bg-[#7A0000]/5";

const UserRoles = () => {
	const [activeTab, setActiveTab] = useState<RoleType>("user");
	const [roles, setRoles] = useState<RoleRecord[]>([]);
	const [selectedEpfNo, setSelectedEpfNo] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isCompaniesLoading, setIsCompaniesLoading] = useState(false);
	const [isCostCentresLoading, setIsCostCentresLoading] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);
	const [motherCompanies, setMotherCompanies] = useState<MotherCompanyOption[]>([]);
	const [costCentres, setCostCentres] = useState<CostCentreOption[]>([]);
	const [userGroups, setUserGroups] = useState<UserGroupOption[]>([]);
	const [isUserGroupsLoading, setIsUserGroupsLoading] = useState(false);
	const [form, setForm] = useState<CreateRoleForm>(initialForm);
	const [isAddingCostCentresToRole, setIsAddingCostCentresToRole] = useState(false);

	const loadMotherCompanies = async () => {
		setIsCompaniesLoading(true);

		try {
			const response = await fetch("/roleadminapi/api/roleinfo/companies");

			if (!response.ok) {
				throw new Error(`Failed to load companies. (${response.status})`);
			}

			const payload = await response.json();

			if (payload?.errorMessage) {
				throw new Error(payload.errorMessage);
			}

			const nextCompanies: MotherCompanyOption[] = Array.isArray(payload?.data)
				? payload.data.map((item: any) => ({
					companyId: item?.CompanyId ?? "",
					companyName: item?.CompanyName ?? "",
				}))
				: [];

			setMotherCompanies(nextCompanies);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to load companies.";
			toast.error(message);
			setMotherCompanies([]);
		} finally {
			setIsCompaniesLoading(false);
		}
	};

	const loadCostCentres = async (companyId: string) => {
		if (!companyId) {
			setCostCentres([]);
			return;
		}

		setIsCostCentresLoading(true);

		try {
			const response = await fetch(
				`/roleadminapi/api/roleinfo/companies/${encodeURIComponent(companyId)}/costcentres`
			);

			if (!response.ok) {
				throw new Error(`Failed to load cost centres. (${response.status})`);
			}

			const payload = await response.json();

			if (payload?.errorMessage) {
				throw new Error(payload.errorMessage);
			}

			const nextCostCentres: CostCentreOption[] = Array.isArray(payload?.data)
				? payload.data.map((item: any) => ({
					costCentreId: item?.CostCentreId ?? "",
					costCentreName: item?.CostCentreName ?? "",
				}))
				: [];

			setCostCentres(nextCostCentres);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to load cost centres.";
			toast.error(message);
			setCostCentres([]);
		} finally {
			setIsCostCentresLoading(false);
		}
	};

	const loadRoles = async (type: RoleType) => {
		setIsLoading(true);

		try {
			let payload: any = null;
			let lastError: Error | null = null;

			for (const endpoint of endpointMap[type]) {
				try {
					const response = await fetch(endpoint);

					if (!response.ok) {
						throw new Error(`Failed to load roles. (${response.status})`);
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
							: new Error("Failed to load roles.");
				}
			}

			if (!payload) {
				throw lastError ?? new Error("Failed to load roles.");
			}

			const nextRoles: RoleRecord[] = Array.isArray(payload?.data)
				? payload.data.map((item: any) => ({
					epfNo: item?.EpfNo ?? "",
					roleId: item?.RoleId ?? "",
					roleName: item?.RoleName ?? "",
					company: item?.Company ?? "",
					motherCompany: item?.MotherCompany ?? "",
					userGroup: item?.UserGroup ?? "",
					costCentre: item?.CostCentre ?? "",
					costCentres: Array.isArray(item?.CostCentres)
						? item.CostCentres.filter((value: string) => value)
						: String(item?.CostCentre ?? "")
							.split(",")
							.map((value: string) => value.trim())
							.filter((value: string) => value.length > 0),
					userType: item?.UserType ?? "",
				}))
				: [];

			setRoles(nextRoles);
			setCurrentPage(1);
			setSelectedEpfNo((current) =>
				current && nextRoles.some((role: RoleRecord) => normalizeKey(role.epfNo) === normalizeKey(current))
					? current
					: null
			);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to load roles.";
			toast.error(message);
			setRoles([]);
			setSelectedEpfNo(null);
		} finally {
			setIsLoading(false);
		}
	};

	const loadUserGroups = async () => {
		setIsUserGroupsLoading(true);

		try {
			const response = await fetch("/roleadminapi/api/roleinfo/usergroups");

			if (!response.ok) {
				throw new Error(`Failed to load user groups. (${response.status})`);
			}

			const payload = await response.json();

			if (payload?.errorMessage) {
				throw new Error(payload.errorMessage);
			}

			const groups: UserGroupOption[] = Array.isArray(payload?.data)
				? payload.data.map((item: any) => ({
					userGroupId: item?.UserGroupId ?? "",
					userGroupName: item?.UserGroupName ?? "",
				}))
				: [];
			setUserGroups(groups);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to load user groups.";
			toast.error(message);
			setUserGroups([]);
		} finally {
			setIsUserGroupsLoading(false);
		}
	};

	useEffect(() => {
		loadRoles(activeTab);
	}, [activeTab]);

	useEffect(() => {
		loadMotherCompanies();
		loadUserGroups();
	}, []);

	useEffect(() => {
		loadCostCentres(form.motherCompany);
	}, [form.motherCompany]);

	const handleFieldChange = (field: keyof CreateRoleForm, value: string) => {
		const normalizedValue =
			field === "roleId" || field === "userType"
				? value.toUpperCase()
				: value;

		setForm((current) => ({ ...current, [field]: normalizedValue }));
	};

	const handleReset = () => {
		setForm(initialForm);
		setCostCentres([]);
		setSelectedEpfNo(null);
	};

	const handleCostCentreToggle = (costCentreId: string) => {
		setForm((current) => ({
			...current,
			costCentres: current.costCentres.includes(costCentreId)
				? current.costCentres.filter((value) => value !== costCentreId)
				: [...current.costCentres, costCentreId],
		}));
	};

	const selectAllCostCentres = () => {
		setForm((current) => ({
			...current,
			costCentres: costCentres.map((item) => item.costCentreId),
		}));
	};

	const invertCostCentreSelection = () => {
		setForm((current) => ({
			...current,
			costCentres: costCentres
				.map((item) => item.costCentreId)
				.filter((costCentreId) => !current.costCentres.includes(costCentreId)),
		}));
	};

	const clearCostCentreSelection = () => {
		setForm((current) => ({
			...current,
			costCentres: [],
		}));
	};

	const handleAddCostCentresToSelectedRole = async () => {
		if (!selectedRole) {
			toast.warning("Please select a role first.");
			return;
		}

		if (form.costCentres.length === 0) {
			toast.warning("Please select at least one cost centre.");
			return;
		}

		setIsAddingCostCentresToRole(true);

		try {
			const response = await fetch(
				`/roleadminapi/api/roleinfo/${encodeURIComponent(selectedRole.epfNo)}/costcentres`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						costCentres: form.costCentres,
					}),
				}
			);

			const payload = await response.json();

			if (payload?.errorMessage) {
				throw new Error(payload.errorDetails ? `${payload.errorMessage} Details: ${payload.errorDetails}` : payload.errorMessage);
			}

			toast.success(payload?.data?.message ?? "Cost centres added successfully.");
			await loadRoles(activeTab);
			setSelectedEpfNo(selectedRole.epfNo);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to add cost centres.";
			toast.error(message);
		} finally {
			setIsAddingCostCentresToRole(false);
		}
	};

	const buildRolePayload = (originalEpfNo?: string) => ({
		originalEpfNo: originalEpfNo?.trim() ?? "",
		epfNo: form.epfNo.trim(),
		roleId: form.roleId.trim().toUpperCase(),
		roleName: form.name.trim(),
		userType: form.userType.trim().toUpperCase(),
		company: form.motherCompany.trim(),
		motherCompany: form.businessCompany.trim(),
		userGroup: form.userGroup.trim(),
		costCentre: form.costCentres[0] ?? "",
		costCentres: form.costCentres,
		lvlNo: 1,
	});

	const handleRoleSelect = (role: RoleRecord) => {
		setSelectedEpfNo(role.epfNo);

		// Denormalize userType: backend stores "ADMIN" but form needs "ADMINISTRATOR"
		const userTypeForForm = role.userType === "ADMIN" ? "ADMINISTRATOR" : role.userType;

		setForm({
			name: role.roleName,
			epfNo: role.epfNo,
			roleId: role.roleId,
			userType: userTypeForForm,
			businessCompany: role.motherCompany,
			userGroup: role.userGroup || initialForm.userGroup,
			motherCompany: role.company,
			costCentres: role.costCentres,
		});

		// Explicitly load cost centres for the selected company
		if (role.company) {
			loadCostCentres(role.company);
		}

		setActiveTab(userTypeForForm.trim().toUpperCase().startsWith("USER") ? "user" : "admin");
	};

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setIsSubmitting(true);

		try {
			const response = await fetch("/roleadminapi/api/roleinfo", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(buildRolePayload()),
			});

			const payload = await response.json();

			if (payload?.errorMessage) {
				throw new Error(payload.errorDetails ? `${payload.errorMessage} Details: ${payload.errorDetails}` : payload.errorMessage);
			}

			toast.success(payload?.data?.message ?? "Role created successfully.");

			handleReset();
			const nextTab =
				form.userType.trim().toUpperCase().startsWith("USER") ? "user" : "admin";
			setActiveTab(nextTab);
			await loadRoles(nextTab);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to create role.";
			toast.error(message);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleEdit = async () => {
		if (!selectedRole) {
			return;
		}

		setIsSubmitting(true);

		try {
			const response = await fetch(
				`/roleadminapi/api/roleinfo/${encodeURIComponent(selectedRole.epfNo)}`,
				{
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(buildRolePayload(selectedRole.epfNo)),
				}
			);
			const payload = await response.json();

			if (payload?.errorMessage) {
				throw new Error(payload.errorDetails ? `${payload.errorMessage} Details: ${payload.errorDetails}` : payload.errorMessage);
			}

			toast.success(payload?.data?.message ?? "Role updated successfully.");
			await loadRoles(activeTab);
			setSelectedEpfNo(form.epfNo.trim());
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to update role.";
			toast.error(message);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDelete = async () => {
		if (!selectedRole) {
			return;
		}

		setIsSubmitting(true);

		try {
			const response = await fetch(
				`/roleadminapi/api/roleinfo/${encodeURIComponent(selectedRole.epfNo)}`,
				{ method: "DELETE" }
			);
			const payload = await response.json();

			if (payload?.errorMessage) {
				throw new Error(payload.errorDetails ? `${payload.errorMessage} Details: ${payload.errorDetails}` : payload.errorMessage);
			}

			toast.success(payload?.data?.message ?? "Role deleted successfully.");
			handleReset();
			await loadRoles(activeTab);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to delete role.";
			toast.error(message);
		} finally {
			setIsSubmitting(false);
		}
	};

	const selectedRole = roles.find((role) => normalizeKey(role.epfNo) === normalizeKey(selectedEpfNo)) ?? null;
	const totalPages = Math.max(1, Math.ceil(roles.length / rolesPerPage));
	const paginatedRoles = roles.slice(
		(currentPage - 1) * rolesPerPage,
		currentPage * rolesPerPage
	);

	const changePage = (page: number) => {
		if (page < 1 || page > totalPages) {
			return;
		}
		setCurrentPage(page);
	};

	return (
		<div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(122,0,0,0.08),_transparent_35%),linear-gradient(180deg,_#faf7f2_0%,_#f3efe7_100%)] px-2 py-4 text-stone-900">
			<div className="mx-auto max-w-7xl space-y-6">
				<section className="grid gap-6 xl:grid-cols-[minmax(0,40%)_minmax(0,60%)] xl:items-start">
					<form
						onSubmit={handleSubmit}
						className="w-full rounded-[28px] border border-[#7A0000]/10 bg-white p-6 shadow-[0_16px_50px_rgba(122,0,0,0.08)] xl:order-1"
					>
						<div className="flex items-start justify-between gap-4">
							<div>
								<h2 className="text-2xl font-semibold text-stone-900">User Role Form</h2>
							</div>
							<button
								type="button"
								onClick={() => loadRoles(activeTab)}
								className="inline-flex items-center gap-2 rounded-full border border-[#7A0000]/20 px-4 py-2 text-sm font-medium text-[#7A0000] transition hover:border-[#7A0000]/40 hover:bg-[#7A0000]/5"
							>
								<RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
								Refresh
							</button>
						</div>

						<div className="mt-6 space-y-6">
							<div className="grid gap-4">
								<Input label="Name" value={form.name} onChange={(value) => handleFieldChange("name", value)} />
								<Input label="Role ID" value={form.roleId} onChange={(value) => handleFieldChange("roleId", value)} />
								<Input label="EPF Number" value={form.epfNo} onChange={(value) => handleFieldChange("epfNo", value)} />
							</div>

							<SelectionGroup
								label="User Type"
								groupName="userType"
								options={roleTypeOptions.map((option) => ({
									label: option.label,
									value: option.value,
								}))}
								value={form.userType}
								onChange={(value) => {
									handleFieldChange("userType", value);
									setActiveTab(value === "USER" ? "user" : "admin");
								}}
							/>

							<Select
								label="User Group"
								value={form.userGroup}
								onChange={(value) => handleFieldChange("userGroup", value)}
								options={userGroups.map((g) => `${g.userGroupId} - ${g.userGroupName}`)}
								optionValues={userGroups.map((g) => g.userGroupId)}
								placeholder={isUserGroupsLoading ? "Loading user groups..." : "Select user group"}
							/>

							<SelectionGroup
								label="Mother Company"
								groupName="company"
								options={businessCompanyOptions.map((option) => ({ label: option, value: option }))}
								value={form.businessCompany}
								onChange={(value) => handleFieldChange("businessCompany", value)}
							/>

							<div className="grid gap-4 md:grid-cols-[1fr]">
								<Select
									label="Company"
									value={form.motherCompany}
									onChange={(value) => {
										handleFieldChange("motherCompany", value);
										clearCostCentreSelection();
									}}
									options={motherCompanies.map((company) => `${company.companyId} - ${company.companyName}`)}
									optionValues={motherCompanies.map((company) => company.companyId)}
									placeholder={isCompaniesLoading ? "Loading companies..." : "Select company"}
								/>
							</div>

							<div>
								<div className="mb-2 flex items-center justify-between gap-3">
									<span className="text-sm font-medium text-stone-700">Cost Center</span>
									<button
										type="button"
										onClick={handleAddCostCentresToSelectedRole}
										aria-label="Add cost centers"
										disabled={!selectedRole || isAddingCostCentresToRole || isSubmitting}
										className="inline-flex items-center gap-2 rounded-md bg-[#7A0000] px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-[#620000] border border-transparent focus:outline-none focus:ring-2 focus:ring-[#7A0000]/30"
									>
										<span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#7A0000] font-semibold">+</span>
										<span className="text-sm">{isAddingCostCentresToRole ? "Adding..." : "Add cost centers"}</span>
									</button>
								</div>
								<div className="rounded-2xl border border-stone-200 bg-stone-50 p-3">
									{isCostCentresLoading ? (
										<div className="text-sm text-stone-500">Loading cost centres...</div>
									) : costCentres.length === 0 ? (
										<div className="text-sm text-stone-500">
											{form.motherCompany
												? "No cost centres found for the selected company."
												: "Select a company to load cost centres."}
										</div>
									) : (
										<>
											<div className="mb-3 flex flex-wrap gap-2">
												<button type="button" onClick={selectAllCostCentres} className="rounded border border-stone-300 bg-white px-2.5 py-1 text-xs text-stone-700 hover:bg-stone-100">select all</button>
												<button type="button" onClick={invertCostCentreSelection} className="rounded border border-stone-300 bg-white px-2.5 py-1 text-xs text-stone-700 hover:bg-stone-100">invert selection</button>
												<button type="button" onClick={clearCostCentreSelection} className="rounded border border-stone-300 bg-white px-2.5 py-1 text-xs text-stone-700 hover:bg-stone-100">select none</button>
												<button type="button" onClick={clearCostCentreSelection} className="rounded border border-stone-300 bg-white px-2.5 py-1 text-xs text-stone-700 hover:bg-stone-100">reset</button>
											</div>
											<ul className="space-y-2">
												{costCentres.map((item) => (
													<li key={item.costCentreId} className="flex items-center gap-2 text-sm text-stone-800">
														<input
															type="checkbox"
															checked={form.costCentres.includes(item.costCentreId)}
															onChange={() => handleCostCentreToggle(item.costCentreId)}
															className="h-4 w-4 rounded border-stone-400 text-[#7A0000] focus:ring-[#7A0000]"
														/>
														<span>
															{item.costCentreId} : {item.costCentreName}
														</span>
													</li>
												))}
											</ul>
										</>
									)}
								</div>
							</div>
						</div>

						<div className="mt-8 flex flex-wrap gap-3">
							<button
								type="submit"
								disabled={isSubmitting}
								className={actionButtonPrimaryClass}
							>
								{isSubmitting ? "Saving..." : "ADD"}
							</button>
							<button
								type="button"
								disabled={!selectedRole || isSubmitting}
								onClick={handleEdit}
								className={actionButtonSoftClass}
							>
								EDIT
							</button>
							<button
								type="button"
								disabled={!selectedRole || isSubmitting}
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

					<section className="w-full rounded-[28px] border border-stone-200 bg-white p-6 shadow-[0_16px_50px_rgba(70,40,20,0.06)] xl:order-2">
						<div className="flex flex-wrap items-center justify-between gap-4">
							<div>
								<h2 className="text-2xl font-semibold text-stone-900">User Role Table</h2>
							</div>

							<div className="inline-flex rounded-full border border-stone-200 bg-stone-100 p-1">
								<TabButton
									label="USER ROLES"
									active={activeTab === "user"}
									onClick={() => setActiveTab("user")}
								/>
								<TabButton
									label="ADMIN ROLES"
									active={activeTab === "admin"}
									onClick={() => setActiveTab("admin")}
								/>
							</div>
						</div>

						<div className="mt-6 overflow-hidden rounded-2xl border border-stone-200 bg-stone-50/40">
							<div className="overflow-x-auto">
								<table className="min-w-full divide-y divide-stone-200 text-sm">
									<thead className="bg-stone-100 text-left text-xs uppercase tracking-[0.15em] text-stone-500">
										<tr>
											<th className="px-4 py-3">EPF No</th>
											<th className="px-4 py-3">Role ID</th>
											<th className="px-4 py-3">Role Name</th>
											<th className="px-4 py-3">Company</th>
											<th className="px-4 py-3">User Type</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-stone-100 bg-white">
										{isLoading ? (
											<tr>
												<td colSpan={5} className="px-4 py-10 text-center text-stone-500">
													Loading roles...
												</td>
											</tr>
										) : roles.length === 0 ? (
											<tr>
												<td colSpan={5} className="px-4 py-10 text-center text-stone-500">
													No roles found for this view.
												</td>
											</tr>
										) : (
											paginatedRoles.map((role) => {
											const isSelected = normalizeKey(selectedEpfNo) === normalizeKey(role.epfNo);
												return (
													<tr
														key={`${role.epfNo}-${role.roleId}`}
														onClick={() => handleRoleSelect(role)}
														className={`cursor-pointer transition ${isSelected ? "bg-[#7A0000]/8" : "hover:bg-stone-50"
															}`}
													>
														<td className="px-4 py-3">{role.epfNo || "-"}</td>
														<td className="px-4 py-3 font-semibold text-stone-900">{role.roleId}</td>
														<td className="px-4 py-3">{role.roleName || "-"}</td>
														<td className="px-4 py-3">{role.company || "-"}</td>
														<td className="px-4 py-3">{role.userType || "-"}</td>
													</tr>
												);
											})
										)}
									</tbody>
								</table>
							</div>
						</div>

						{roles.length > 0 && (
							<div className="mt-4 flex items-center justify-between gap-3 text-sm">
								<div className="text-stone-600">
									Page {currentPage} of {totalPages}
								</div>
								<div className="flex items-center gap-2">
									<button
										type="button"
										onClick={() => changePage(currentPage - 1)}
										disabled={currentPage === 1}
										className="rounded-md border border-stone-300 px-3 py-1.5 text-stone-700 disabled:cursor-not-allowed disabled:opacity-40"
									>
										Previous
									</button>
									<button
										type="button"
										onClick={() => changePage(currentPage + 1)}
										disabled={currentPage === totalPages}
										className="rounded-md border border-stone-300 px-3 py-1.5 text-stone-700 disabled:cursor-not-allowed disabled:opacity-40"
									>
										Next
									</button>
								</div>
							</div>
						)}

						<div className="mt-5 rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-stone-600">
							{selectedRole ? (
								<div className="grid gap-1 md:grid-cols-2">
									<div>
										<span className="font-semibold text-stone-800">Selected Role:</span> {selectedRole.roleId}
									</div>
									<div>
										<span className="font-semibold text-stone-800">Role Name:</span> {selectedRole.roleName || "-"}
									</div>
									<div>
										<span className="font-semibold text-stone-800">EPF No:</span> {selectedRole.epfNo || "-"}
									</div>
									<div>
										<span className="font-semibold text-stone-800">User Type:</span> {selectedRole.userType || "-"}
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
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
	type?: string;
}) => (
	<label className="block">
		<span className="mb-1.5 block text-sm font-medium text-stone-700">{label}</span>
		<input
			type={type}
			value={value}
			onChange={(event) => onChange(event.target.value)}
			className={fieldBaseClass}
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
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
	options: string[];
	optionValues?: string[];
	placeholder?: string;
}) => (
	<label className="block">
		<span className="mb-1.5 block text-sm font-medium text-stone-700">{label}</span>
		<select
			value={value}
			onChange={(event) => onChange(event.target.value)}
			className={fieldBaseClass}
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

const SelectionGroup = ({
	label,
	groupName,
	options,
	value,
	onChange,
}: {
	label: string;
	groupName: string;
	options: Array<{ label: string; value: string }>;
	value: string;
	onChange: (value: string) => void;
}) => (
	<div>
		<div className="mb-2 text-sm font-medium text-stone-700">{label}</div>
		<div className="flex flex-wrap items-center gap-5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2">
			{options.map((option) => {
				const isActive = option.value === value;

				return (
					<label
						key={option.value}
						className="inline-flex cursor-pointer items-center gap-2 text-sm text-stone-800"
					>
						<input
							type="radio"
							name={groupName}
							checked={isActive}
							onChange={() => onChange(option.value)}
							className="h-4 w-4 border-stone-400 text-[#7A0000] focus:ring-[#7A0000]"
						/>
						<span>{option.label}</span>
					</label>
				);
			})}
		</div>
	</div>
);

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
		className={`rounded-full px-4 py-2 text-sm font-semibold transition ${active ? "bg-[#7A0000] text-white shadow" : "text-stone-600 hover:text-stone-900"
			}`}
	>
		{label}
	</button>
);

export default UserRoles;
