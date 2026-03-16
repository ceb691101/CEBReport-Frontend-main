import { FormEvent, useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
	ShieldCheck,
	RefreshCw,
	Users,
	UserCog,
	Building2,
	FolderTree,
} from "lucide-react";

type RoleType = "admin" | "user";

type RoleRecord = {
	epfNo: string;
	roleId: string;
	roleName: string;
	company: string;
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
	costCentre: string;
};

type MotherCompanyOption = {
	companyId: string;
	companyName: string;
};

type CostCentreOption = {
	costCentreId: string;
	costCentreName: string;
};

const businessCompanyOptions = ["EDL", "NTNSP", "EGL", "NSO"];
const userGroupOptions = ["DGM", "AGM", "IT"];
const roleTypeOptions: RoleType[] = ["user", "admin"];

const initialForm: CreateRoleForm = {
	name: "",
	epfNo: "",
	roleId: "",
	userType: "USER",
	businessCompany: "EDL",
	userGroup: "DGM",
	motherCompany: "",
	costCentre: "",
};

const endpointMap: Record<RoleType, string> = {
	admin: "/roleadminapi/api/roleinfo/admin",
	user: "/roleadminapi/api/roleinfo/user",
};

const fieldBaseClass =
	"w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-800 shadow-sm outline-none transition focus:border-[#7A0000] focus:ring-2 focus:ring-[#7A0000]/10";

const UserRoles = () => {
	const [activeTab, setActiveTab] = useState<RoleType>("user");
	const [roles, setRoles] = useState<RoleRecord[]>([]);
	const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isCompaniesLoading, setIsCompaniesLoading] = useState(false);
	const [isCostCentresLoading, setIsCostCentresLoading] = useState(false);
	const [motherCompanies, setMotherCompanies] = useState<MotherCompanyOption[]>([]);
	const [costCentres, setCostCentres] = useState<CostCentreOption[]>([]);
	const [form, setForm] = useState<CreateRoleForm>(initialForm);

	const loadMotherCompanies = async () => {
		setIsCompaniesLoading(true);

		try {
			const response = await fetch("/roleadminapi/api/roleinfo/companies");
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
				error instanceof Error ? error.message : "Failed to load mother companies.";
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
			const response = await fetch(endpointMap[type]);
			const payload = await response.json();

			if (payload?.errorMessage) {
				throw new Error(payload.errorMessage);
			}

			const nextRoles: RoleRecord[] = Array.isArray(payload?.data)
				? payload.data.map((item: any) => ({
						epfNo: item?.EpfNo ?? "",
						roleId: item?.RoleId ?? "",
						roleName: item?.RoleName ?? "",
						company: item?.Company ?? "",
						userType: item?.UserType ?? "",
					}))
				: [];

			setRoles(nextRoles);
			setSelectedRoleId((current) =>
				current && nextRoles.some((role: RoleRecord) => role.roleId === current)
					? current
					: null
			);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to load roles.";
			toast.error(message);
			setRoles([]);
			setSelectedRoleId(null);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		loadRoles(activeTab);
	}, [activeTab]);

	useEffect(() => {
		loadMotherCompanies();
	}, []);

	useEffect(() => {
		loadCostCentres(form.motherCompany);
	}, [form.motherCompany]);

	const handleFieldChange = (field: keyof CreateRoleForm, value: string) => {
		setForm((current) => ({ ...current, [field]: value }));
	};

	const handleReset = () => {
		setForm(initialForm);
		setCostCentres([]);
		setSelectedRoleId(null);
	};

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setIsSubmitting(true);

		try {
			const response = await fetch("/roleadminapi/api/roleinfo", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					epfNo: form.epfNo.trim(),
					roleId: form.roleId.trim(),
					roleName: form.name.trim(),
					userType: form.userType.trim(),
					company: form.motherCompany.trim(),
					userGroup: form.userGroup.trim(),
					costCentre: form.costCentre.trim(),
					lvlNo: 0,
				}),
			});

			const payload = await response.json();

			if (payload?.errorMessage) {
				throw new Error(payload.errorMessage);
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

	const selectedRole = roles.find((role) => role.roleId === selectedRoleId) ?? null;

	return (
		<div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(122,0,0,0.08),_transparent_35%),linear-gradient(180deg,_#faf7f2_0%,_#f3efe7_100%)] px-2 py-4 text-stone-900">
			<div className="mx-auto max-w-7xl space-y-6">
				<section className="overflow-hidden rounded-[28px] border border-stone-200 bg-white/85 shadow-[0_20px_70px_rgba(70,40,20,0.08)] backdrop-blur">
					<div className="grid gap-6 px-6 py-8 md:grid-cols-[1.4fr_0.8fr] md:px-8">
						<div>
							<div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#7A0000]/8 px-4 py-2 text-sm font-semibold text-[#7A0000]">
								<ShieldCheck className="h-4 w-4" />
								User Role Administration
							</div>
							<h1 className="max-w-2xl font-serif text-3xl font-semibold tracking-tight text-stone-900 md:text-4xl">
								Elegant role setup for your admin workspace.
							</h1>
							<p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600 md:text-base">
								Build roles with a structured flow: choose user type, group, company,
								mother company, and the cost centre list loaded for that company.
							</p>
						</div>

						<div className="grid gap-4 sm:grid-cols-2 md:grid-cols-1">
							<div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
								<div className="flex items-center gap-3">
									<div className="rounded-xl bg-[#7A0000] p-3 text-white">
										<UserCog className="h-5 w-5" />
									</div>
									<div>
										<div className="text-xs uppercase tracking-[0.2em] text-stone-500">
											Active Role View
										</div>
										<div className="text-lg font-semibold text-stone-900">
											{activeTab === "admin" ? "Admin Roles" : "User Roles"}
										</div>
									</div>
								</div>
							</div>

							<div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
								<div className="flex items-center gap-3">
									<div className="rounded-xl bg-stone-900 p-3 text-white">
										<Users className="h-5 w-5" />
									</div>
									<div>
										<div className="text-xs uppercase tracking-[0.2em] text-stone-500">
											Loaded Role Count
										</div>
										<div className="text-lg font-semibold text-stone-900">{roles.length}</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</section>

				<section className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
					<form
						onSubmit={handleSubmit}
						className="rounded-[28px] border border-[#7A0000]/10 bg-white p-6 shadow-[0_16px_50px_rgba(122,0,0,0.08)]"
					>
						<div className="flex items-start justify-between gap-4">
							<div>
								<h2 className="text-2xl font-semibold text-stone-900">User Role Form</h2>
								<p className="mt-2 text-sm text-stone-600">
									Enter the role details in sequence and submit a single backend request.
								</p>
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
							<div className="grid gap-4 md:grid-cols-2">
								<Input label="Name" value={form.name} onChange={(value) => handleFieldChange("name", value)} />
								<Input label="Role ID" value={form.roleId} onChange={(value) => handleFieldChange("roleId", value)} />
								<Input label="EPF Number" value={form.epfNo} onChange={(value) => handleFieldChange("epfNo", value)} />
							</div>

							<SelectionGroup
								label="User Type"
								options={roleTypeOptions.map((option) => ({
									label: option === "user" ? "USER" : "ADMIN",
									value: option.toUpperCase(),
								}))}
								value={form.userType}
								onChange={(value) => {
									handleFieldChange("userType", value);
									setActiveTab(value === "ADMIN" ? "admin" : "user");
								}}
							/>

							<SelectionGroup
								label="User Group"
								options={userGroupOptions.map((option) => ({ label: option, value: option }))}
								value={form.userGroup}
								onChange={(value) => handleFieldChange("userGroup", value)}
							/>

							<SelectionGroup
								label="Company"
								options={businessCompanyOptions.map((option) => ({ label: option, value: option }))}
								value={form.businessCompany}
								onChange={(value) => handleFieldChange("businessCompany", value)}
							/>

							<div className="grid gap-4 md:grid-cols-[1fr_auto]">
								<Select
									label="Mother Company"
									value={form.motherCompany}
									onChange={(value) => {
										handleFieldChange("motherCompany", value);
										handleFieldChange("costCentre", "");
									}}
									options={motherCompanies.map((company) => `${company.companyId} - ${company.companyName}`)}
									optionValues={motherCompanies.map((company) => company.companyId)}
									placeholder={isCompaniesLoading ? "Loading companies..." : "Select mother company"}
								/>
								<div className="flex items-end rounded-2xl border border-[#7A0000]/10 bg-[#7A0000]/5 px-4 py-3 text-sm text-stone-700">
									<div className="flex items-center gap-2">
										<Building2 className="h-4 w-4 text-[#7A0000]" />
										{form.motherCompany || "No company selected"}
									</div>
								</div>
							</div>

							<div>
								<div className="mb-2 flex items-center gap-2 text-sm font-medium text-stone-700">
									<FolderTree className="h-4 w-4 text-[#7A0000]" />
									Cost Center
								</div>
								<div className="rounded-2xl border border-stone-200 bg-stone-50 p-3">
									{isCostCentresLoading ? (
										<div className="text-sm text-stone-500">Loading cost centres...</div>
									) : costCentres.length === 0 ? (
										<div className="text-sm text-stone-500">
											{form.motherCompany
												? "No cost centres found for the selected mother company."
												: "Select a mother company to load cost centres."}
										</div>
									) : (
										<div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
											{costCentres.map((item) => (
												<TickCard
													key={item.costCentreId}
													label={item.costCentreId}
													subLabel={item.costCentreName}
													selected={form.costCentre === item.costCentreId}
													onClick={() => handleFieldChange("costCentre", item.costCentreId)}
												/>
											))}
										</div>
									)}
								</div>
							</div>
						</div>

						<div className="mt-8 flex flex-wrap gap-3">
							<button
								type="submit"
								disabled={isSubmitting}
								className="rounded-lg bg-[#7A0000] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#620000] disabled:cursor-not-allowed disabled:opacity-60"
							>
								{isSubmitting ? "Saving..." : "ADD"}
							</button>
							<button
								type="button"
								disabled={!selectedRole}
								onClick={() => toast.info("Edit backend endpoint is not implemented yet.")}
								className="rounded-lg bg-[#7A0000]/85 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#620000] disabled:cursor-not-allowed disabled:opacity-50"
							>
								EDIT
							</button>
							<button
								type="button"
								disabled={!selectedRole}
								onClick={() => toast.info("Delete backend endpoint is not implemented yet.")}
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

					<section className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-[0_16px_50px_rgba(70,40,20,0.06)]">
						<div className="flex flex-wrap items-center justify-between gap-4">
							<div>
								<h2 className="text-2xl font-semibold text-stone-900">Role Directory</h2>
								<p className="mt-2 text-sm text-stone-600">
									Switch between user and admin roles, then review the roles already configured.
								</p>
							</div>

							<div className="inline-flex rounded-full border border-stone-200 bg-stone-100 p-1">
								<TabButton
									label="User Roles"
									active={activeTab === "user"}
									onClick={() => setActiveTab("user")}
								/>
								<TabButton
									label="Admin Roles"
									active={activeTab === "admin"}
									onClick={() => setActiveTab("admin")}
								/>
							</div>
						</div>

						<div className="mt-6 overflow-hidden rounded-2xl border border-stone-200">
							<div className="overflow-x-auto">
								<table className="min-w-full divide-y divide-stone-200 text-sm">
									<thead className="bg-stone-100 text-left text-xs uppercase tracking-[0.2em] text-stone-500">
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
											roles.map((role) => {
												const isSelected = selectedRoleId === role.roleId;

												return (
													<tr
														key={`${role.roleId}-${role.epfNo}`}
														onClick={() => setSelectedRoleId(role.roleId)}
														className={`cursor-pointer transition ${
															isSelected ? "bg-[#7A0000]/8" : "hover:bg-stone-50"
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
	options,
	value,
	onChange,
}: {
	label: string;
	options: Array<{ label: string; value: string }>;
	value: string;
	onChange: (value: string) => void;
}) => (
	<div>
		<div className="mb-2 text-sm font-medium text-stone-700">{label}</div>
		<div className="flex flex-wrap gap-2">
			{options.map((option) => {
				const isActive = option.value === value;

				return (
					<button
						key={option.value}
						type="button"
						onClick={() => onChange(option.value)}
						className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
							isActive
								? "border-[#7A0000] bg-[#7A0000] text-white shadow"
								: "border-stone-300 bg-white text-stone-700 hover:border-[#7A0000]/40 hover:text-[#7A0000]"
						}`}
					>
						{option.label}
					</button>
				);
			})}
		</div>
	</div>
);

const TickCard = ({
	label,
	subLabel,
	selected,
	onClick,
}: {
	label: string;
	subLabel: string;
	selected: boolean;
	onClick: () => void;
}) => (
	<button
		type="button"
		onClick={onClick}
		className={`rounded-2xl border px-4 py-3 text-left transition ${
			selected
				? "border-[#7A0000] bg-[#7A0000]/8 shadow-sm"
				: "border-stone-200 bg-white hover:border-[#7A0000]/30 hover:bg-[#7A0000]/5"
		}`}
	>
		<div className="flex items-start gap-3">
			<div
				className={`mt-1 h-4 w-4 rounded-full border ${
					selected ? "border-[#7A0000] bg-[#7A0000]" : "border-stone-300 bg-white"
				}`}
			/>
			<div className="min-w-0">
				<div className="text-sm font-semibold text-stone-900">{label}</div>
				<div className="truncate text-xs text-stone-500">{subLabel}</div>
			</div>
		</div>
	</button>
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
		className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
			active ? "bg-[#7A0000] text-white shadow" : "text-stone-600 hover:text-stone-900"
		}`}
	>
		{label}
	</button>
);

export default UserRoles;
