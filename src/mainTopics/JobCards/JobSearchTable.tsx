import React, {useState} from "react";
import {Search, RotateCcw} from "lucide-react";
import {toast} from "react-toastify";

interface JobSearchResult {
	ApplicationId: string;
	ApplicationNo: string;
	ProjectNo: string;
	IdNo: string;
	FirstName: string;
	LastName: string;
	StreetAddress: string;
	Suburb: string;
	City: string;
	ApplicationTypeDesc: string;
	SubmitDate: string | null;
	Status?: string;
	Telephone: string;
	Mobile: string;
}

interface JobSearchTableProps {
	onSelectRow: (row: JobSearchResult | null) => void;
}

const JobSearchTable: React.FC<JobSearchTableProps> = ({onSelectRow}) => {
	const maroon = "text-[#7A0000]";
	const maroonGrad = "bg-gradient-to-r from-[#7A0000] to-[#A52A2A]";

	const [form, setForm] = useState({
		applicationId: "",
		applicationNo: "",
		projectNo: "",
		idNo: "",
		accountNo: "",
		phone: "",
	});

	const [results, setResults] = useState<JobSearchResult[]>([]);
	const [loading, setLoading] = useState(false);
	const [hasSearched, setHasSearched] = useState(false);
	const [selectedRow, setSelectedRow] = useState<JobSearchResult | null>(null);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const {name, value} = e.target;
		setForm((prev) => ({...prev, [name]: value.trim()}));
	};

	const handleSearch = async () => {
		const hasAnyInput = Object.values(form).some((v) => !!v.trim());

		if (!hasAnyInput) {
			toast.error("Please enter at least one search parameter");
			return;
		}

		setLoading(true);
		setResults([]);
		setSelectedRow(null);
		setHasSearched(true);
		onSelectRow(null);

		try {
			const params = new URLSearchParams();

			if (form.applicationId)
				params.append("applicationId", form.applicationId);
			if (form.applicationNo)
				params.append("applicationNo", form.applicationNo);
			if (form.projectNo) params.append("projectNo", form.projectNo);
			if (form.idNo) params.append("idNo", form.idNo);
			if (form.accountNo) params.append("accountNo", form.accountNo);
			if (form.phone) params.append("phone", form.phone);

			const res = await fetch(`/misapi/api/jobsearch?${params.toString()}`);

			if (!res.ok) throw new Error(`HTTP error ${res.status}`);

			const data = await res.json();

			const searchResults: JobSearchResult[] =
				data.data || data.result || data || [];

			const uniqueResults = Array.from(
				new Map(
					searchResults.map((item) => [item.ApplicationId, item]),
				).values(),
			);

			setResults(uniqueResults);

			if (uniqueResults.length === 0) {
				toast.info("No matching records found.");
			} else {
				toast.success(`Found ${uniqueResults.length} record(s)`);
			}
		} catch (err) {
			console.error(err);
			toast.error("Failed to fetch search results.");
		} finally {
			setLoading(false);
		}
	};

	const handleClear = () => {
		setForm({
			applicationId: "",
			applicationNo: "",
			projectNo: "",
			idNo: "",
			accountNo: "",
			phone: "",
		});

		setResults([]);
		setSelectedRow(null);
		setHasSearched(false);
		onSelectRow(null);
	};

	const handleRowSelect = (row: JobSearchResult) => {
		const newSelected =
			selectedRow?.ApplicationId === row.ApplicationId ? null : row;

		setSelectedRow(newSelected);
		onSelectRow(newSelected);
	};

	const formatDate = (dateStr: string | null) => {
		if (!dateStr) return "—";

		try {
			return new Date(dateStr).toLocaleDateString("en-GB", {
				day: "2-digit",
				month: "2-digit",
				year: "numeric",
			});
		} catch {
			return dateStr;
		}
	};

	return (
		<div className="max-w-[100%] mx-auto p-3 bg-white rounded-xl shadow border border-gray-200 text-sm font-sans mt-1 ml-2">
			<h2 className={`text-xl font-bold ${maroon} mb-5`}>
				Application Search - Ordinary
			</h2>

			{/* Search Form */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 bg-gray-50 p-5 rounded-lg border border-gray-200">
				{[
					{
						label: "Application No",
						name: "applicationId",
						example: "423.10/ANC/23/0012",
					},
					{
						label: "Estimation No",
						name: "applicationNo",
						example: "423.10/ENC/23/0012",
					},
					{
						label: "Job No",
						name: "projectNo",
						example: "423.10/SMC/23/0012",
					},
					{label: "ID Number", name: "idNo", example: "Enter ID No"},
					{
						label: "Account No",
						name: "accountNo",
						example: "Enter Account No",
					},
					{
						label: "Telephone / Mobile",
						name: "phone",
						example: "Enter Phone No",
					},
				].map((field) => (
					<div key={field.name} className="flex flex-col">
						<label className={`font-medium ${maroon} mb-1.5`}>
							{field.label}
						</label>

						<input
							type="text"
							name={field.name}
							value={form[field.name as keyof typeof form]}
							onChange={handleInputChange}
							placeholder={`${field.example}`}
							className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7A0000]/50 transition w-full"
						/>
					</div>
				))}
			</div>

			{/* Buttons */}
			<div className="flex flex-wrap gap-3 justify-end mb-6">
				<button
					onClick={handleSearch}
					disabled={loading}
					className={`flex items-center gap-2 px-4 py-2 ${maroonGrad} text-white rounded-lg font-medium shadow hover:brightness-110 transition disabled:opacity-60`}
				>
					<Search size={18} />
					{loading ? "Searching..." : "Search"}
				</button>

				<button
					onClick={handleClear}
					className="flex items-center gap-2 px-4 py-2 border border-gray-400 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
				>
					<RotateCcw size={18} />
					Clear
				</button>
			</div>

			{/* Results */}
			{loading ? (
				<div className="text-center py-12 text-gray-600 bg-gray-50 rounded-lg border border-dashed">
					Searching...
				</div>
			) : results.length > 0 ? (
				<div className="border border-gray-200 rounded-lg overflow-hidden">
					<div className="max-h-[60vh] overflow-auto scroll-smooth">
						<table className="min-w-[1100px] w-full text-left text-gray-700 text-[12px]">
							<thead
								className={`${maroonGrad} text-white text-center sticky top-0 z-10`}
							>
								<tr>
									<th className="px-4 py-2">Application No</th>
									<th className="px-4 py-2">Estimation No</th>
									<th className="px-4 py-2">Job No</th>
									<th className="px-4 py-2">ID No</th>
									<th className="px-4 py-2">Name</th>
									<th className="px-4 py-2">Telephone</th>
									<th className="px-4 py-2">Mobile</th>
									<th className="px-4 py-2">Address</th>
									<th className="px-4 py-2">Type</th>
									<th className="px-4 py-2">Submitted</th>
									<th className="px-4 py-2">Status</th>
								</tr>
							</thead>

							<tbody>
								{results.map((row, index) => {
									const fullName =
										[row.FirstName, row.LastName]
											.filter(Boolean)
											.join(" ") || "—";

									const address =
										[row.StreetAddress, row.Suburb, row.City]
											.filter(Boolean)
											.join(", ") || "—";

									const isSelected =
										selectedRow?.ApplicationId === row.ApplicationId;

									return (
										<tr
											key={row.ApplicationId || index}
											className={`border-b ${
												isSelected
													? "bg-blue-100"
													: index % 2 === 0
														? "bg-white"
														: "bg-gray-50"
											}`}
										>
											<td className="px-4 py-3">
												<span
													onClick={() => handleRowSelect(row)}
													className="text-slate-700 hover:underline font-medium px-3 py-1.5  inline-block cursor-pointer"
												>
													{row.ApplicationId || "—"}
												</span>
											</td>

											<td className="px-4 py-3">
												{row.ApplicationNo || "—"}
											</td>
											<td className="px-4 py-3">
												{row.ProjectNo || "—"}
											</td>
											<td className="px-4 py-3">
												{row.IdNo || "—"}
											</td>
											<td className="px-4 py-3">{fullName}</td>
											<td className="px-4 py-3 font-mono">
												{row.Telephone || "—"}
											</td>
											<td className="px-4 py-3 font-mono">
												{row.Mobile || "—"}
											</td>
											<td className="px-4 py-3 max-w-xs break-words">
												{address}
											</td>
											<td className="px-4 py-3">
												{row.ApplicationTypeDesc || "—"}
											</td>
											<td className="px-4 py-3">
												{formatDate(row.SubmitDate)}
											</td>

											<td className="px-4 py-3">
												<span className="px-2.5 py-1 rounded-lg font-medium text-xs bg-emerald-100 text-emerald-800 block text-center min-w-[120px]">
													{row.Status || "—"}
												</span>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				</div>
			) : hasSearched ? (
				<div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
					No results found. Try different search criteria.
				</div>
			) : null}
		</div>
	);
};

export default JobSearchTable;
