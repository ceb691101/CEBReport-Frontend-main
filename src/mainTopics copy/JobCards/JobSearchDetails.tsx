import React, {useEffect, useState} from "react";
import {toast} from "react-toastify";

export interface JobSearchResult {
	ApplicationId: string;
	ApplicationNo: string;
	ProjectNo: string;
	IdNo: string;
	FirstName: string;
	LastName: string;
	Status?: string;
	// ... other fields if needed
}

interface ApplicationStatus {
	ApplicationNo?: string;
	FullName: string;
	IdNo: string;
	Address?: string;
	ServiceAddress?: string;
	TelephoneNo?: string;
	MobileNo?: string;
	Email?: string;
	status?: string;
}

interface EstimateInfo {
	PivNo: string;
	TitleCd: string;
	PivAmount: number;
	PivDate: string; // ISO string
	PaidDate: string; // ISO string
	ApplicationType: string;
	Phase: string;
	ConnectionType: string;
	TariffCatCode: string;
	TariffCode: string;
	ApplicationDate: string; // ISO string
	NeighborsAccNo: string;
	ExistingAccNo: string | null;
	AssessmentNo: string | null;
}

interface SmsLog {
	sendDate: string;
	teleNo: string;
	message: string;
}

interface DetailedEstimate {
	FixedCost: number;
	VariableCost: number;
	SecurityDeposit: number;
	TemporaryDeposit: number;
	ConversionCost: number;
	LabourCost: number;
	TransportCost: number;
	OverheadCost: number;
	DamageCost: number;
	ContingencyCost: number;
	BoardCharge: number;
	Sscl: number | null;
	TotalCost: number;
}

interface LabourDetail {
	LabourCode: string;
	ActivityDescription: string;
	UnitLabourHrs: number;
	UnitPrice: number;
	ItemQty: number;
	CebUnitPrice: number;
	CebLabourCost: number;
}

interface MaterialTransaction {
	MatCode: string;
	UnitPrice: number;
	EstimateQty: number;
	EstimateCost: number;
}

interface EstimateApproval {
	ApprovedLevel: string;
	ApprovedDate: string;
	ApprovedTime: string;
	StandardCost: number;
	DetailedCost: number;
}
interface EnergizingBasic {
	ExportedDate?: string;
	AccountNo?: string;
	AccCreatedDate?: string;
}
interface EnergizeDate {
	EnergizedDate?: string;
	finalized_date?: string;
}

interface JobSearchDetailsProps {
	selectedRow: JobSearchResult | null;
	onClose: () => void;
}

const JobSearchDetails: React.FC<JobSearchDetailsProps> = ({
	selectedRow,
	onClose,
}) => {
	const [statusData, setStatusData] = useState<ApplicationStatus | null>(null);
	const [estimateData, setEstimateData] = useState<EstimateInfo | null>(null);
	const [detailedEstimate, setDetailedEstimate] =
		useState<DetailedEstimate | null>(null);
	const [smsData, setSmsData] = useState<SmsLog[]>([]);
	const [loading, setLoading] = useState(false);

	// Labour expandable states
	const [isLabourExpanded, setIsLabourExpanded] = useState(false);
	const [labourDetails, setLabourDetails] = useState<LabourDetail[]>([]);
	const [labourLoading, setLabourLoading] = useState(false);

	// Material expandable states
	const [isMaterialExpanded, setIsMaterialExpanded] = useState(false);
	const [materialDetails, setMaterialDetails] = useState<
		MaterialTransaction[]
	>([]);
	const [materialLoading, setMaterialLoading] = useState(false);

	// Calculated totals
	const [calculatedLabourTotal, setCalculatedLabourTotal] = useState<
		number | null
	>(null);
	const [calculatedMaterialTotal, setCalculatedMaterialTotal] = useState<
		number | null
	>(null);

	// Job Information bottom section states
	const [jobHistory, setJobHistory] = useState<any>(null);
	const [energizedInfo, setEnergizedInfo] = useState<EnergizingBasic | null>(
		null,
	);
	const [energizeDate, setEnergizeDate] = useState<EnergizeDate[]>([]);
	const [contractorInfo, setContractorInfo] = useState<any>(null);

	//estimate approval info
	const [estimateApprovals, setEstimateApprovals] = useState<
		EstimateApproval[]
	>([]);

	// nrevised estimate approval info 
	const [revisedEstimateApprovals, setRevisedEstimateApprovals] = useState<
		EstimateApproval[]
	>([]);

	//job finalize date
	const [jobFinalizeDate, setJobFinalizeDate] = useState<any>(null);
	//contractor bill date and bill no
	const [contractorBills, setContractorBills] = useState<any>(null);

	//piv tables
	const [pivDetailsApp, setPivDetailsApp] = useState<any>(null);
	const [pivDetailsEST, setPivDetailsEST] = useState<any>(null);
	const [pivDetailsJob, setPivDetailsJob] = useState<any>(null);
	const [appointmentInfo, setAppointmentInfo] = useState<any>(null);

	//for the detailed estimations for estimation information
	const [estimateSummary, setEstimateSummary] = useState<
		{ResType: string; TotalEstimateCost: number}[]
	>([]);
	//for the detailed estimations for estimation information
	// New (for Job table)
	const [isLabourExpandedJob, setIsLabourExpandedJob] = useState(false);
	const [isMaterialExpandedJob, setIsMaterialExpandedJob] = useState(false);
	// For Revised / Job-level Detail Estimate
	const [estimateSummaryJob, setEstimateSummaryJob] = useState<
		{ResType: string; TotalEstimateCost: number}[]
	>([]);

	// Job-specific labour & material (if the API returns different data)
	const [labourDetailsJob, setLabourDetailsJob] = useState<LabourDetail[]>([]);
	const [materialDetailsJob, setMaterialDetailsJob] = useState<
		MaterialTransaction[]
	>([]);

	const [calculatedLabourTotalJob, setCalculatedLabourTotalJob] = useState<
		number | null
	>(null);
	const [calculatedMaterialTotalJob, setCalculatedMaterialTotalJob] = useState<
		number | null
	>(null);
	const formatDate = (dateStr: string | null) => {
		if (!dateStr) return "—";
		try {
			const date = new Date(dateStr);
			const year = date.getFullYear();
			const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
			const day = String(date.getDate()).padStart(2, "0");
			return `${year}/${month}/${day}`;
		} catch (error) {
			return "—";
		}
	};

	const formatCurrency = (value: number | null | undefined) => {
		if (value == null || isNaN(value)) return "—";
		return value.toLocaleString("en-US", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		});
	};

	const formatResType = (resType: string) => {
		return resType
			.split("-")
			.map(
				(word) =>
					word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
			)
			.join(" ");
	};

	useEffect(() => {
		if (!selectedRow) return;

		const fetchDetails = async () => {
			setLoading(true);
			setStatusData(null);
			setSmsData([]);
			setEstimateData(null);
			setEstimateApprovals([]);
			setDetailedEstimate(null);
			setIsLabourExpanded(false);
			setLabourDetails([]);
			setLabourLoading(false);
			setIsMaterialExpanded(false);
			setMaterialDetails([]);
			setMaterialLoading(false);
			setCalculatedLabourTotal(null);
			setCalculatedMaterialTotal(null);
			setJobHistory(null);
			setEnergizedInfo(null);
			setContractorInfo(null);
			setJobFinalizeDate(null);
			setPivDetailsApp(null);
			setPivDetailsEST(null);
			setPivDetailsJob(null);

			try {
				// 1. Application Status
				const statusRes = await fetch(
					`/misapi/api/jobsearch/application-status?application_id=${encodeURIComponent(
						selectedRow.ApplicationId.trim(),
					)}`,
				);

				if (statusRes.ok) {
					const json = await statusRes.json();
					let extractedStatus: ApplicationStatus | null = null;
					if (json?.success && json?.data) {
						extractedStatus = json.data;
					} else if (json?.ApplicationNo) {
						extractedStatus = json;
					}
					setStatusData(extractedStatus);
				}

				// 2. SMS
				const refId =
					selectedRow.ApplicationNo || selectedRow.ProjectNo || "";
				if (refId.trim()) {
					const smsRes = await fetch(
						"/smsapi/smsOutDetails/api/getSmsoutData",

						{
							method: "POST",
							headers: {"Content-Type": "application/json"},
							body: JSON.stringify({ref_id: refId, appkey: "SMC"}),
						},
					);

					if (smsRes.ok) {
						const json = await smsRes.json();
						setSmsData(
							Array.isArray(json.smsOutDetails)
								? json.smsOutDetails
								: [],
						);
					}
				}

				// 3. PIV / Application Info
				const estimateRes = await fetch(
					`/misapi/api/jobsearch/application-info?application_id=${encodeURIComponent(
						selectedRow.ApplicationId.trim(),
					)}`,
				);

				if (estimateRes.ok) {
					const json = await estimateRes.json();
					if (Array.isArray(json.data) && json.data.length > 0) {
						setEstimateData(json.data[0]);
					}
				}

				// 4. Detailed Estimate
				const estimateNo = selectedRow.ApplicationNo || "";
				if (estimateNo) {
					const estimateDetailRes = await fetch(
						`/misapi/api/jobsearch/estimate-info?estimate_no=${encodeURIComponent(estimateNo)}`,
					);

					if (estimateDetailRes.ok) {
						const json = await estimateDetailRes.json();
						if (json.success && json.data) {
							setDetailedEstimate(json.data);
						}
					}
				}

				// Auto fetch Labour details
				if (selectedRow?.ApplicationNo) {
					try {
						const labourEstimateNo = selectedRow.ApplicationNo.trim();
						const labourRes = await fetch(
							`/misapi/api/jobsearch/labour-details?estimate_no=${encodeURIComponent(labourEstimateNo)}`,
						);
						if (labourRes.ok) {
							const json = await labourRes.json();
							const details = Array.isArray(json?.data) ? json.data : [];
							setLabourDetails(details);
							const labourSum = details.reduce(
								(sum: number, item: LabourDetail) => {
									return sum + (Number(item.CebLabourCost) || 0);
								},
								0,
							);
							setCalculatedLabourTotal(labourSum);
						}
					} catch (labourErr) {
						console.error("Auto fetch labour failed:", labourErr);
						setLabourDetails([]);
						setCalculatedLabourTotal(null);
					}
				}

				// Auto fetch Material details
				if (selectedRow?.ApplicationNo) {
					try {
						const estimateNo = selectedRow.ApplicationNo.trim();
						const materialRes = await fetch(
							`/misapi/api/jobsearch/material-transactions?estimateNo=${encodeURIComponent(estimateNo)}`,
						);
						if (materialRes.ok) {
							const json = await materialRes.json();
							const details = Array.isArray(json?.data) ? json.data : [];
							setMaterialDetails(details);
							const materialSum = details.reduce(
								(sum: number, item: MaterialTransaction) => {
									return sum + (Number(item.EstimateCost) || 0);
								},
								0,
							);
							setCalculatedMaterialTotal(materialSum);
						}
					} catch (materialErr) {
						console.error("Auto fetch material failed:", materialErr);
						setMaterialDetails([]);
						setCalculatedMaterialTotal(null);
					}
				}
				// Job finalized date
				if (selectedRow?.ProjectNo) {
					try {
						const projectNo = selectedRow.ProjectNo.trim();

						const finalizedDateRes = await fetch(
							`/misapi/api/jobsearch/job-finalized-info?project_no=${encodeURIComponent(projectNo)}`,
						);

						if (finalizedDateRes.ok) {
							const json = await finalizedDateRes.json();

							if (json?.success && json?.data) {
								setJobFinalizeDate(json.data);
							} else {
								setJobFinalizeDate(null);
							}
						}
					} catch (err) {
						console.error("Failed to fetch job finalized date:", err);
						setJobFinalizeDate(null);
					}
				}

				// Job Status History (for Job Created Date, Physical & Financial Close)
				if (selectedRow?.ProjectNo) {
					try {
						const projectNo = selectedRow.ProjectNo.trim();
						const historyRes = await fetch(
							`/misapi/api/jobsearch/job-status-history?project_no=${encodeURIComponent(projectNo)}`,
						);
						if (historyRes.ok) {
							const json = await historyRes.json();
							setJobHistory(
								Array.isArray(json.data) && json.data.length > 0
									? json.data[0]
									: null,
							);
						}
					} catch (err) {
						console.error("Failed to fetch job status history:", err);
						setJobHistory(null);
					}
				}

				// --- Energized Info ---
				try {
					const energizedRes = await fetch(
						`/misapi/api/jobsearch/energizing-basic?project_no=${encodeURIComponent(selectedRow.ProjectNo)}`,
					);
					if (energizedRes.ok) {
						const json = await energizedRes.json();

						// API returns object, not array
						setEnergizedInfo(json.data || null);
					} else {
						setEnergizedInfo(null);
						console.error(
							"Failed to fetch energized info: ",
							energizedRes.status,
						);
					}
				} catch (err) {
					console.error("Failed to fetch energized info:", err);
					setEnergizedInfo(null);
				}
				if (selectedRow?.ProjectNo) {
					try {
						const res = await fetch(
							`/misapi/api/jobsearch/energized-info?project_no=${encodeURIComponent(
								selectedRow.ProjectNo.trim(),
							)}`,
						);

						if (res.ok) {
							const json = await res.json();

							// API returns array
							setEnergizeDate(json.data || []);
						} else {
							console.error(
								"Failed to fetch energize date:",
								res.status,
							);
							setEnergizeDate([]);
						}
					} catch (err) {
						console.error("Failed to fetch energize date:", err);
						setEnergizeDate([]);
					}
				}

				// Contractor Info (for Contractor Bill Info)
				if (selectedRow?.ProjectNo) {
					try {
						const projectNo = selectedRow.ProjectNo.trim();
						const contractorRes = await fetch(
							`/misapi/api/jobsearch/contractor-info?project_no=${encodeURIComponent(projectNo)}`,
						);
						if (contractorRes.ok) {
							const json = await contractorRes.json();
							setContractorInfo(
								Array.isArray(json.data) && json.data.length > 0
									? json.data[0]
									: null,
							);
						}
					} catch (err) {
						setContractorInfo(null);
					}
				}

				// Contractor Bills
				if (selectedRow?.ProjectNo) {
					try {
						const projectNo = selectedRow.ProjectNo.trim();

						const billRes = await fetch(
							`/misapi/api/jobsearch/contractor-bills?project_no=${encodeURIComponent(projectNo)}`,
						);

						if (billRes.ok) {
							const json = await billRes.json();

							if (json?.success && Array.isArray(json?.data)) {
								setContractorBills(json.data);
							} else {
								setContractorBills([]);
							}
						}
					} catch (err) {
						setContractorBills([]);
					}
				}

				// Estimate Approvals
				if (estimateNo) {
					try {
						const approvalRes = await fetch(
							`/misapi/api/jobsearch/estimate-approvals?estimate_no=${encodeURIComponent(estimateNo)}`,
						);

						if (approvalRes.ok) {
							const json = await approvalRes.json();

							setEstimateApprovals(
								Array.isArray(json?.data) ? json.data : [],
							);
						}
					} catch (err) {
						setEstimateApprovals([]);
					}
				}

				//Revised Estimate Approvals (Job level)
				if (selectedRow?.ProjectNo) {
					try {
						const projectNo = selectedRow.ProjectNo.trim();
						const revisedApprovalRes = await fetch(
							`/misapi/api/jobsearch/revised-estimate-approvals?projectNO=${encodeURIComponent(projectNo)}`,
						);

						if (revisedApprovalRes.ok) {
							const json = await revisedApprovalRes.json();

							// Adjust according to your actual response shape
							const approvals = Array.isArray(json?.data)
								? json.data
								: json?.success && Array.isArray(json?.approvals)
									? json.approvals
									: [];

							setRevisedEstimateApprovals(approvals);
						} else {
							setRevisedEstimateApprovals([]);
						}
					} catch (err) {
						console.error(
							"Failed to fetch revised estimate approvals:",
							err,
						);
						setRevisedEstimateApprovals([]);
					}
				}

				// Fetch Estimate Cost Summary for detailed estimations - full table
				if (estimateNo) {
					try {
						const summaryRes = await fetch(
							`/misapi/api/jobsearch/estimate-cost-summary?estimateNo=${encodeURIComponent(estimateNo)}`,
						);
						if (summaryRes.ok) {
							const json = await summaryRes.json();
							if (json.success && Array.isArray(json.data)) {
								setEstimateSummary(
									json.data.map(
										(item: {
											ResType: string;
											TotalEstimateCost: number;
										}) => ({
											...item,
											ResType: item.ResType.trim(), // Trim spaces from ResType
										}),
									),
								);
							} else {
								setEstimateSummary([]);
							}
						}
					} catch (err) {
						setEstimateSummary([]);
					}
				}
				//piv API's ____________________________________

				//for application id - application no
				if (selectedRow?.ApplicationId) {
					try {
						const referenceNo = selectedRow.ApplicationId.trim();

						const res = await fetch(
							`/misapi/api/jobsearch/piv-details?referenceNo=${encodeURIComponent(referenceNo)}`,
						);

						if (res.ok) {
							const json = await res.json();
							if (json?.success && Array.isArray(json.data)) {
								setPivDetailsApp(json.data);
							} else {
								setPivDetailsApp([]);
							}
						}
					} catch (err) {
						setPivDetailsApp([]);
					}
				}
				//_____________________________________
				//piv for estimate information for
				//_____________________________________
				if (selectedRow?.ApplicationNo) {
					try {
						const referenceNo = selectedRow.ApplicationNo.trim();

						const res = await fetch(
							`/misapi/api/jobsearch/piv-details?referenceNo=${encodeURIComponent(referenceNo)}`,
						);

						if (res.ok) {
							const json = await res.json();
							if (json?.success && Array.isArray(json.data)) {
								setPivDetailsEST(json.data);
							} else {
								setPivDetailsEST([]);
							}
						}
					} catch (err) {
						console.error("Failed to fetch PIV details:", err);
						setPivDetailsEST([]);
					}
				}

				// --- Appointment Info ---
				if (selectedRow?.ApplicationNo) {
					try {
						const referenceNo = selectedRow.ApplicationNo.trim();

						const appointmentRes = await fetch(
							`/misapi/api/jobsearch/appointment-info?reference_no=${encodeURIComponent(referenceNo)}`,
						);

						if (!appointmentRes.ok) {
							console.warn(
								`Appointment fetch failed: ${appointmentRes.status}`,
							);
							setAppointmentInfo(null);
							return;
						}

						const json = await appointmentRes.json();

						if (
							json.success &&
							Array.isArray(json.data) &&
							json.data.length > 0
						) {
							setAppointmentInfo(json.data[0]);
							json.data[0];
							// only first record
						} else {
							setAppointmentInfo(null);
						}
					} catch (error) {
						console.error("Error fetching appointment info:", error);
						setAppointmentInfo(null);
					}
				}

				// ── Job-specific Detailed Estimate Summary ────────────────────────────────
				if (estimateNo) {
					try {
						const summaryJobRes = await fetch(
							`/misapi/api/jobsearch/estimate-cost-job?estimateNo=${encodeURIComponent(estimateNo)}`,
						);
						if (summaryJobRes.ok) {
							const json = await summaryJobRes.json();
							if (json.success && Array.isArray(json.data)) {
								setEstimateSummaryJob(
									json.data.map(
										(item: {
											ResType: string;
											TotalEstimateCost: number;
										}) => ({
											...item,
											ResType: item.ResType.trim(),
										}),
									),
								);
							} else {
								setEstimateSummaryJob([]);
							}
						}
					} catch (err) {
						console.error(
							"Failed to fetch job estimate cost summary:",
							err,
						);
						setEstimateSummaryJob([]);
					}
				}

				// ── Job-specific Labour Details ───────────────────────────────────────────
				if (selectedRow?.ApplicationNo) {
					try {
						const labourResJob = await fetch(
							`/misapi/api/jobsearch/labour-details-for-job?estimateNo=${encodeURIComponent(
								selectedRow.ApplicationNo.trim(),
							)}`,
							// Note: you didn't give exact labour-for-job endpoint → adjust name if different
						);
						if (labourResJob.ok) {
							const json = await labourResJob.json();
							const details = Array.isArray(json?.data) ? json.data : [];
							setLabourDetailsJob(details);

							const labourSum = details.reduce(
								(sum: number, item: LabourDetail) =>
									sum + (Number(item.CebLabourCost) || 0),
								0,
							);
							setCalculatedLabourTotalJob(labourSum);
						}
					} catch (err) {
						console.error("Failed to fetch job labour details:", err);
						setLabourDetailsJob([]);
						setCalculatedLabourTotalJob(null);
					}
				}

				// ── Job-specific Material Details ─────────────────────────────────────────
				if (selectedRow?.ApplicationNo) {
					try {
						const materialResJob = await fetch(
							`/misapi/api/jobsearch/material-transactions-for-job?estimateNo=${encodeURIComponent(
								selectedRow.ApplicationNo.trim(),
							)}`,
						);
						if (materialResJob.ok) {
							const json = await materialResJob.json();
							const details = Array.isArray(json?.data) ? json.data : [];
							setMaterialDetailsJob(details);

							const materialSum = details.reduce(
								(sum: number, item: MaterialTransaction) =>
									sum + (Number(item.EstimateCost) || 0),
								0,
							);
							setCalculatedMaterialTotalJob(materialSum);
						}
					} catch (err) {
						console.error(
							"Failed to fetch job material transactions:",
							err,
						);
						setMaterialDetailsJob([]);
						setCalculatedMaterialTotalJob(null);
					}
				}
				//_____________________________________
				//piv for job information
				//_____________________________________
				if (selectedRow?.ProjectNo) {
					try {
						const referenceNo = selectedRow.ProjectNo.trim();

						const res = await fetch(
							`/misapi/api/jobsearch/piv-details?referenceNo=${encodeURIComponent(referenceNo)}`,
						);

						if (res.ok) {
							const json = await res.json();
							if (json?.success && Array.isArray(json.data)) {
								setPivDetailsJob(json.data);
							} else {
								setPivDetailsJob([]);
							}
						}
					} catch (err) {
						console.error("Failed to fetch PIV details:", err);
						setPivDetailsJob([]);
					}
				}
			} catch (err) {
				console.error("Error loading details:", err);
				toast.error("Could not load job details");
			} finally {
				setLoading(false);
			}
		};

		fetchDetails();
	}, [selectedRow]);

	const toggleLabourDetails = () => {
		setIsLabourExpanded((prev) => !prev);
	};

	const toggleMaterialDetails = () => {
		setIsMaterialExpanded((prev) => !prev);
	};

	// For Job table
	const toggleLabourDetailsJob = () => {
		setIsLabourExpandedJob((prev) => !prev);
	};
	const toggleMaterialDetailsJob = () => {
		setIsMaterialExpandedJob((prev) => !prev);
	};

	if (!selectedRow) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/90 print:static print:inset-auto print:p-0 print:bg-white mb-20">
			<div className="relative bg-white w-[95vw] sm:w-[90vw] md:w-[85vw] lg:w-[80vw] xl:w-[75vw] max-w-7xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden mt-20 md:mt-32 lg:mt-40 lg:ml-64 mx-auto print:relative print:w-full print:max-w-none print:rounded-none print:shadow-none print:border-none print:overflow-visible">
				<div className="flex justify-end p-4">
					<button
						onClick={onClose}
						className="flex items-center justify-center w-10 h-10 rounded-full
		hover:bg-gray-100 text-gray-500 hover:text-gray-800
		transition duration-200 focus:outline-none"
						aria-label="Close"
					>
						<svg
							className="w-5 h-5"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2.5}
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>

				<div className="p-2 md:p-2 max-h-[80vh] overflow-y-auto print:p-0 print:max-h-none print:overflow-visible print:mt-10 print:ml-12">
					<div className="flex justify-end gap-3 mb-6 md:mb-8 print:hidden"></div>

					<div className="flex-1 overflow-y-auto p-6 space-y-10 text-[11px]">
						{loading ? (
							<div className="flex flex-col items-center justify-center h-64 gap-4">
								<div className="w-10 h-10 border-4 border-gray-300 border-t-[#7A0000] rounded-full animate-spin"></div>
								<span className="text-gray-600 text-sm font-medium tracking-wide">
									Loading...
								</span>
							</div>
						) : (
							<>
								{/* ── Previous sections (unchanged) ── */}
								<h4 className="text-sm font-bold text-white bg-gradient-to-r from-[#7A0000] to-[#A52A2A] px-3 py-2 border border-gray-300 mb-6">
									Application Status
								</h4>

								<section className="flex flex-col md:flex-row md:space-x-6 px-4">
									<div className="flex-1 max-w-sm">
										<dl className="space-y-2">
											<div>
												<dt className="font-bold text-gray-700 inline">
													Application No:{" "}
												</dt>
												<dd>
													<span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md">
														{" "}
														{statusData?.ApplicationNo || "—"}
													</span>
												</dd>
											</div>
											<div>
												<dt className="font-bold text-gray-700 inline">
													Name:{" "}
												</dt>
												<dd className="text-gray-900 inline">
													{statusData?.FullName || "—"}
												</dd>
											</div>
											<div>
												<dt className="font-bold text-gray-700 inline">
													ID No:{" "}
												</dt>
												<dd className="font-mono text-gray-900 inline">
													{statusData?.IdNo ||
														selectedRow?.IdNo ||
														"—"}
												</dd>
											</div>
											<div>
												<dt className="font-bold text-gray-700 inline">
													Address:{" "}
												</dt>
												<dd className="text-gray-800 inline">
													{statusData?.Address || "—"}
												</dd>
											</div>
											<div>
												<dt className="font-bold text-gray-700 inline">
													Service Address:{" "}
												</dt>
												<dd className="text-gray-800 inline">
													{statusData?.ServiceAddress || "—"}
												</dd>
											</div>
											<div>
												<dt className="font-bold text-gray-700 inline">
													Telephone:{" "}
												</dt>
												<dd className="font-mono inline">
													{statusData?.TelephoneNo || "—"}
												</dd>
											</div>
											<div>
												<dt className="font-bold text-gray-700 inline">
													Mobile:{" "}
												</dt>
												<dd className="font-mono inline">
													{statusData?.MobileNo || "—"}
												</dd>
											</div>
											<div>
												<dt className="font-bold text-gray-700 inline">
													Email:{" "}
												</dt>
												<dd className="text-gray-900 inline">
													{statusData?.Email || "—"}
												</dd>
											</div>
											<div>
												<dt className="font-bold text-gray-700 inline">
													Status:{" "}
												</dt>
												<dd className="text-gray-900 inline">
													<span className="bg-yellow-200 px-2 py-0.5 rounded-lg">
														{selectedRow?.Status || "—"}
													</span>
												</dd>
											</div>
										</dl>
									</div>

									<div className="flex-1 overflow-x-auto mt-4 md:mt-0">
										<h4 className="text-sm font-bold text-[#7A0000] px-1 py-1 mb-1">
											SMS Log
										</h4>
										<table className="table-auto border-collapse border border-gray-300 text-[10.5px]">
											<thead className="bg-gray-100 text-black font-semibold">
												<tr>
													<th className="border px-2 py-1 text-center w-[20%]">
														Sent Date
													</th>
													<th className="border px-2 py-1 text-center w-[20%]">
														Mobile No
													</th>
													<th className="border px-2 py-1 text-center w-[60%]">
														Message
													</th>
												</tr>
											</thead>
											<tbody>
												{smsData.length === 0 ? (
													<tr>
														<td
															colSpan={3}
															className="border px-4 py-3 text-center text-gray-500"
														>
															No messages available
														</td>
													</tr>
												) : (
													smsData.map((sms, index) => (
														<tr
															key={index}
															className={
																index % 2 === 0
																	? "bg-white"
																	: "bg-gray-50"
															}
														>
															<td className="border px-2 py-1 text-gray-700">
																{sms.sendDate || "—"}
															</td>
															<td className="border px-2 py-1 font-mono text-gray-700">
																{sms.teleNo || "—"}
															</td>
															<td className="border px-2 py-1 text-gray-700 whitespace-pre-wrap">
																{sms.message || "—"}
															</td>
														</tr>
													))
												)}
											</tbody>
										</table>
									</div>
								</section>

								<h4 className="text-xs font-bold text-white bg-gradient-to-r from-[#7A0000] to-[#A52A2A] px-3 py-2 border border-gray-300 mb-4">
									Application Information
								</h4>

								<div className="grid grid-cols-1 lg:grid-cols-[35%_65%] gap-6 mt-6">
									<section>
										<div className="border border-gray-300 p-4 text-xs bg-white">
											<div className="grid grid-cols-[max-content_auto] gap-y-2 gap-x-2">
												<div className="font-semibold">
													Application Type
												</div>
												<div className="flex items-center">
													<span className="mr-1">:</span>
													<span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded">
														{estimateData?.ApplicationType || "—"}
													</span>
												</div>
												<div className="font-semibold">
													Connection Info
												</div>
												<div className="flex items-center">
													<span className="mr-1">:</span>
													<span>
														{estimateData
															? `${estimateData.Phase} Phase / ${estimateData.ConnectionType}A / ${estimateData.TariffCatCode} / ${estimateData.TariffCode}`
															: "—"}
													</span>
												</div>
												<div className="font-semibold">
													Application Date
												</div>
												<div className="flex items-center">
													<span className="mr-1">:</span>
													<span>
														{estimateData?.ApplicationDate
															? estimateData.ApplicationDate.split(
																	"T",
																)[0]
															: "—"}
													</span>
												</div>
												<div className="font-semibold">
													Neighbors Account No
												</div>
												<div className="flex items-center">
													<span className="mr-1">:</span>
													<span>
														{estimateData?.NeighborsAccNo || "—"}
													</span>
												</div>
												<div className="font-semibold">
													Existing Account No
												</div>
												<div className="flex items-center">
													<span className="mr-1">:</span>
													<span>
														{estimateData?.ExistingAccNo || "—"}
													</span>
												</div>
												<div className="font-semibold">
													Assessment No
												</div>
												<div className="flex items-center">
													<span className="mr-1">:</span>
													<span>
														{estimateData?.AssessmentNo || "—"}
													</span>
												</div>
											</div>
										</div>
									</section>
									{/* Application Information*/}
									<section>
										<h4 className="text-sm font-bold text-[#7A0000] px-3 py-1 mb-0">
											PIV Details
										</h4>
										<div className="overflow-x-auto">
											<table className="table-auto border-collapse border border-gray-300 text-[10.5px]">
												<thead className="bg-gray-100 text-black font-semibold">
													<tr>
														<th className="border px-2 py-1 text-center">
															PIV No
														</th>
														<th className="border px-2 py-1 text-center">
															PIV Type
														</th>
														<th className="border px-2 py-1 text-center">
															Amount
														</th>
														<th className="border px-2 py-1 text-center">
															Issued Date
														</th>
														<th className="border px-2 py-1 text-center">
															Paid Date
														</th>
														<th className="border px-2 py-1 text-center">
															Status
														</th>
													</tr>
												</thead>
												<tbody>
													{Array.isArray(pivDetailsApp) &&
													pivDetailsApp.length > 0 ? (
														pivDetailsApp.map(
															(piv: any, index: number) => (
																<tr
																	key={index}
																	className="bg-white hover:bg-gray-50"
																>
																	<td className="border px-2 py-1 text-center">
																		{piv.PivNo || "—"}
																	</td>
																	<td className="border px-2 py-1 text-center">
																		{piv.PivType || "—"}
																	</td>
																	<td className="border px-2 py-1 text-right">
																		{piv.PivAmount
																			? piv.PivAmount.toLocaleString()
																			: "—"}
																	</td>
																	<td className="border px-2 py-1 text-center">
																		{formatDate(
																			piv.PivDate,
																		) || "—"}
																	</td>
																	<td className="border px-2 py-1 text-center">
																		{formatDate(
																			piv.PaidDate,
																		) || "—"}
																	</td>
																	<td className="border px-2 py-1 text-center">
																		{piv.Status || "—"}
																	</td>
																</tr>
															),
														)
													) : (
														<tr>
															<td
																colSpan={6}
																className="border px-4 py-3 text-center text-gray-500"
															>
																No PIV data available
															</td>
														</tr>
													)}
												</tbody>
											</table>
										</div>
									</section>
								</div>

								<h4 className="text-sm font-bold text-white bg-gradient-to-r from-[#7A0000] to-[#A52A2A] px-3 py-2 border border-gray-300 mb-6">
									Estimation Information
								</h4>

								<section className="flex flex-col lg:flex-row lg:space-x-8 px-4 gap-y-8 lg:gap-y-0">
									<div className="flex-1 lg:max-w-lg xl:max-w-xl space-y-6">
										<div className="border border-gray-300 p-4 text-xs bg-white">
											<dl className="grid grid-cols-[50%,50%] gap-x-4 gap-y-1.5">
												<dt className="font-bold text-gray-700">
													Estimate Number :
												</dt>
												<dd>
													<span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md">
														{selectedRow.ApplicationNo || "—"}
													</span>
												</dd>
												<dt className="font-bold text-gray-700">
													Site Visited Date :
												</dt>
												<dd className="text-gray-900">
													{" "}
													{appointmentInfo?.AppointmentDate
														? formatDate(
																appointmentInfo.AppointmentDate,
															)
														: "—"}
												</dd>
												<dt className="font-bold text-gray-700">
													Estimate Date :
												</dt>
												<dd className="text-gray-900">
													{formatDate(
														jobFinalizeDate?.EstimatedDate,
													) || "—"}
												</dd>
											</dl>
										</div>

										<div>
											<h5 className="text-sm font-bold text-[#7A0000] mb-2 px-1">
												Standard Estimate
											</h5>
											<div className="overflow-x-auto border border-gray-300">
												<table className="table-auto border-collapse w-full text-xs">
													<thead className="bg-gray-100 text-black font-semibold">
														<tr>
															<th className="border px-3 py-1.5 text-left">
																Description
															</th>
															<th className="border px-3 py-1.5 text-right">
																Amount (LKR)
															</th>
														</tr>
													</thead>
													<tbody>
														{detailedEstimate ? (
															<>
																<tr className="bg-white">
																	<td className="border px-3 py-1">
																		Fixed Cost
																	</td>
																	<td className="border px-3 py-1 text-right">
																		{formatCurrency(
																			detailedEstimate.FixedCost,
																		)}
																	</td>
																</tr>
																<tr className="bg-gray-50">
																	<td className="border px-3 py-1">
																		Variable Cost
																	</td>
																	<td className="border px-3 py-1 text-right">
																		{formatCurrency(
																			detailedEstimate.VariableCost,
																		)}
																	</td>
																</tr>
																<tr className="bg-white">
																	<td className="border px-3 py-1">
																		Security Deposit
																	</td>
																	<td className="border px-3 py-1 text-right">
																		{formatCurrency(
																			detailedEstimate.SecurityDeposit,
																		)}
																	</td>
																</tr>
																<tr className="bg-gray-50">
																	<td className="border px-3 py-1">
																		Temporary Deposit
																	</td>
																	<td className="border px-3 py-1 text-right">
																		{formatCurrency(
																			detailedEstimate.TemporaryDeposit,
																		)}
																	</td>
																</tr>
																<tr className="bg-white">
																	<td className="border px-3 py-1">
																		Conversion Cost
																	</td>
																	<td className="border px-3 py-1 text-right">
																		{formatCurrency(
																			detailedEstimate.ConversionCost,
																		)}
																	</td>
																</tr>
																<tr className="bg-gray-50">
																	<td className="border px-3 py-1">
																		Labour Cost
																	</td>
																	<td className="border px-3 py-1 text-right">
																		{formatCurrency(
																			detailedEstimate.LabourCost,
																		)}
																	</td>
																</tr>
																<tr className="bg-white">
																	<td className="border px-3 py-1">
																		Transport Cost
																	</td>
																	<td className="border px-3 py-1 text-right">
																		{formatCurrency(
																			detailedEstimate.TransportCost,
																		)}
																	</td>
																</tr>
																<tr className="bg-gray-50">
																	<td className="border px-3 py-1">
																		Overhead Cost
																	</td>
																	<td className="border px-3 py-1 text-right">
																		{formatCurrency(
																			detailedEstimate.OverheadCost,
																		)}
																	</td>
																</tr>
																<tr className="bg-white">
																	<td className="border px-3 py-1">
																		Damage Cost
																	</td>
																	<td className="border px-3 py-1 text-right">
																		{formatCurrency(
																			detailedEstimate.DamageCost,
																		)}
																	</td>
																</tr>
																<tr className="bg-gray-50">
																	<td className="border px-3 py-1">
																		Contingency Cost
																	</td>
																	<td className="border px-3 py-1 text-right">
																		{formatCurrency(
																			detailedEstimate.ContingencyCost,
																		)}
																	</td>
																</tr>
																<tr className="bg-white">
																	<td className="border px-3 py-1">
																		Board Charge
																	</td>
																	<td className="border px-3 py-1 text-right">
																		{formatCurrency(
																			detailedEstimate.BoardCharge,
																		)}
																	</td>
																</tr>
																<tr className="bg-white">
																	<td className="border px-3 py-1">
																		SSCL
																	</td>
																	<td className="border px-3 py-1 text-right">
																		{formatCurrency(
																			detailedEstimate.Sscl,
																		)}
																	</td>
																</tr>
																<tr className="bg-gray-50 font-semibold">
																	<td className="border px-3 py-1.5">
																		Total
																	</td>
																	<td className="border px-3 py-1.5 text-right text-blue-800 font-medium">
																		{formatCurrency(
																			detailedEstimate.TotalCost,
																		)}
																	</td>
																</tr>
															</>
														) : (
															<tr>
																<td
																	colSpan={2}
																	className="border px-4 py-6 text-center text-gray-500"
																>
																	No standard estimate data
																	available
																</td>
															</tr>
														)}
													</tbody>
												</table>
											</div>
										</div>
									</div>

									{/* Detail Estimate */}
									<div className="flex-1 space-y-6">
										{/* Revised Job Approvals */}
										<div>
											<h5 className="text-sm font-bold text-[#7A0000] mb-2">
												Estimate Approvals
											</h5>
											<table className="table-auto border-collapse border border-gray-300 text-[10.5px] w-full">
												<thead className="bg-gray-100 text-black font-semibold">
													<tr>
														<th className="border px-3 py-1.5 text-center">
															Approved By
														</th>
														<th className="border px-3 py-1.5 text-center">
															Date
														</th>
														<th className="border px-3 py-1.5 text-center">
															Time
														</th>
														<th className="border px-3 py-1.5 text-center">
															Standard Cost
														</th>
														<th className="border px-3 py-1.5 text-center">
															Detail Cost
														</th>
													</tr>
												</thead>
												<tbody>
													{estimateApprovals.length > 0 ? (
														estimateApprovals.map(
															(item, index) => (
																<tr key={index}>
																	<td className="border px-3 py-1.5 text-center">
																		{item.ApprovedLevel}
																	</td>
																	<td className="border px-3 py-1.5 text-center">
																		{item.ApprovedDate
																			? new Date(
																					item.ApprovedDate,
																				).toLocaleDateString()
																			: "-"}
																	</td>
																	<td className="border px-3 py-1.5 text-center">
																		{item.ApprovedTime || "-"}
																	</td>
																	<td className="border px-3 py-1.5 text-right">
																		{item.StandardCost?.toLocaleString(
																			undefined,
																			{
																				minimumFractionDigits: 2,
																				maximumFractionDigits: 2,
																			},
																		)}
																	</td>
																	<td className="border px-3 py-1.5 text-right">
																		{item.DetailedCost?.toLocaleString(
																			undefined,
																			{
																				minimumFractionDigits: 2,
																				maximumFractionDigits: 2,
																			},
																		)}
																	</td>
																</tr>
															),
														)
													) : (
														<tr>
															<td
																colSpan={5}
																className="border px-4 py-4 text-center text-gray-500 text-xs"
															>
																No Estimate Approvals available
															</td>
														</tr>
													)}
												</tbody>
											</table>
										</div>
										{/* PIV Details for Estimate */}
										<section>
											<h4 className="text-sm font-bold text-[#7A0000] px-3 py-1 mb-0">
												PIV Details
											</h4>
											<div className="overflow-x-auto">
												<table className="table-auto border-collapse border border-gray-300 text-[10.5px]">
													<thead className="bg-gray-100 text-black font-semibold">
														<tr>
															<th className="border px-2 py-1 text-center">
																PIV No
															</th>
															<th className="border px-2 py-1 text-center">
																PIV Type
															</th>
															<th className="border px-2 py-1 text-center">
																Amount
															</th>
															<th className="border px-2 py-1 text-center">
																Issued Date
															</th>
															<th className="border px-2 py-1 text-center">
																Paid Date
															</th>
															<th className="border px-2 py-1 text-center">
																Status
															</th>
														</tr>
													</thead>
													<tbody>
														{Array.isArray(pivDetailsEST) &&
														pivDetailsEST.length > 0 ? (
															pivDetailsEST.map((piv, index) => (
																<tr
																	key={index}
																	className="bg-white hover:bg-gray-50"
																>
																	<td className="border px-2 py-1 text-center">
																		{piv.PivNo || "—"}
																	</td>
																	<td className="border px-2 py-1 text-center">
																		{piv.PivType || "—"}
																	</td>
																	<td className="border px-2 py-1 text-right">
																		{piv.PivAmount
																			? piv.PivAmount.toLocaleString()
																			: "—"}
																	</td>
																	<td className="border px-2 py-1 text-center">
																		{formatDate(
																			piv.PivDate,
																		) || "—"}
																	</td>
																	<td className="border px-2 py-1 text-center">
																		{formatDate(
																			piv.PaidDate,
																		) || "—"}
																	</td>
																	<td className="border px-2 py-1 text-center">
																		{piv.Status || "—"}
																	</td>
																</tr>
															))
														) : (
															<tr>
																<td
																	colSpan={6}
																	className="border px-4 py-3 text-center text-gray-500"
																>
																	No PIV data available
																</td>
															</tr>
														)}
													</tbody>
												</table>
											</div>
										</section>
										<div>
											<h5 className="text-sm font-bold text-[#7A0000] mb-2 px-1">
												Detail Estimate
											</h5>
											<div className="overflow-x-auto border border-gray-300">
												<table className="table-auto border-collapse w-full text-[11px]">
													<thead className="bg-gray-100 text-black font-semibold">
														<tr>
															<th className="border px-3 py-1.5 text-left">
																Description
															</th>
															<th className="border px-3 py-1.5 text-right">
																Amount (LKR)
															</th>
														</tr>
													</thead>
													<tbody>
														{estimateSummary.length > 0 ? (
															<>
																{estimateSummary.map(
																	(item, index) => {
																		const resType =
																			item.ResType;
																		const isLabour =
																			resType ===
																			"LABOUR-COST";
																		const isMaterial =
																			resType === "MAT-COST";
																		const isExpandable =
																			isLabour || isMaterial;
																		const expanded = isLabour
																			? isLabourExpanded
																			: isMaterial
																				? isMaterialExpanded
																				: false;
																		const toggle = isLabour
																			? toggleLabourDetails
																			: isMaterial
																				? toggleMaterialDetails
																				: () => {};
																		const displayCost =
																			isLabour
																				? (calculatedLabourTotal ??
																					item.TotalEstimateCost)
																				: isMaterial
																					? (calculatedMaterialTotal ??
																						item.TotalEstimateCost)
																					: item.TotalEstimateCost;
																		const loadingText =
																			(isLabour &&
																				labourDetails.length ===
																					0 &&
																				selectedRow?.ApplicationNo) ||
																			(isMaterial &&
																				materialDetails.length ===
																					0 &&
																				selectedRow?.ApplicationNo)
																				? "Loading..."
																				: null;

																		return (
																			<React.Fragment
																				key={index}
																			>
																				<tr
																					className={
																						index % 2 ===
																						0
																							? "bg-white"
																							: "bg-gray-50"
																					}
																				>
																					<td
																						className={`border px-3 py-1 ${isExpandable ? "cursor-pointer hover:bg-yellow-50 transition-colors" : ""} ${
																							expanded
																								? "font-semibold"
																								: ""
																						}`}
																						onClick={
																							isExpandable
																								? toggle
																								: undefined
																						}
																					>
																						{isExpandable && (
																							<span className="inline-block w-4 text-center mr-1.5">
																								{expanded
																									? "▼"
																									: "▶"}
																							</span>
																						)}
																						{formatResType(
																							resType,
																						)}
																					</td>
																					<td className="border px-3 py-1 text-right font-medium">
																						{loadingText ||
																							formatCurrency(
																								displayCost,
																							)}
																					</td>
																				</tr>
																				{expanded && (
																					<tr>
																						<td
																							colSpan={2}
																							className="p-0 border-t-0"
																						>
																							<div className="bg-gray-50 p-3">
																								{isLabour && (
																									<>
																										{labourLoading ? (
																											<div className="flex justify-center py-6">
																												<div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#7A0000]"></div>
																											</div>
																										) : labourDetails.length ===
																										  0 ? (
																											<div className="text-center py-6 text-gray-500">
																												No
																												labour
																												details
																												available
																											</div>
																										) : (
																											<div className="overflow-x-auto">
																												<table className="w-full text-[10.5px] border border-gray-300">
																													<thead className="bg-gray-100 text-black font-semibold">
																														<tr>
																															<th className="border px-3 py-1.5 text-left">
																																Labour
																																Code
																															</th>
																															<th className="border px-3 py-1.5 text-left">
																																Description
																															</th>
																															<th className="border px-3 py-1.5 text-center">
																																Unit
																																Lab.
																																Hrs.
																															</th>
																															<th className="border px-3 py-1.5 text-center">
																																Qty
																															</th>
																															<th className="border px-3 py-1.5 text-right">
																																Rate
																															</th>
																															<th className="border px-3 py-1.5 text-right">
																																Cost
																															</th>
																														</tr>
																													</thead>
																													<tbody>
																														{labourDetails.map(
																															(
																																item,
																																idx,
																															) => (
																																<tr
																																	key={
																																		idx
																																	}
																																	className={
																																		idx %
																																			2 ===
																																		0
																																			? "bg-white"
																																			: "bg-gray-50"
																																	}
																																>
																																	<td className="border px-3 py-1 font-mono">
																																		{item.LabourCode ||
																																			"—"}
																																	</td>
																																	<td className="border px-3 py-1">
																																		{item.ActivityDescription ||
																																			"—"}
																																	</td>
																																	<td className="border px-3 py-1 text-center">
																																		{item.UnitLabourHrs?.toFixed(
																																			1,
																																		) ||
																																			"—"}
																																	</td>
																																	<td className="border px-3 py-1 text-center">
																																		{item.ItemQty?.toFixed(
																																			1,
																																		) ||
																																			"—"}
																																	</td>
																																	<td className="border px-3 py-1 text-right">
																																		{formatCurrency(
																																			item.UnitPrice,
																																		)}
																																	</td>
																																	<td className="border px-3 py-1 text-right font-medium">
																																		{formatCurrency(
																																			item.CebLabourCost,
																																		)}
																																	</td>
																																</tr>
																															),
																														)}
																													</tbody>
																												</table>
																											</div>
																										)}
																									</>
																								)}
																								{isMaterial && (
																									<>
																										{materialLoading ? (
																											<div className="flex justify-center py-6">
																												<div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#7A0000]"></div>
																											</div>
																										) : materialDetails.length ===
																										  0 ? (
																											<div className="text-center py-6 text-gray-500">
																												No
																												material
																												transactions
																												available
																											</div>
																										) : (
																											<div className="overflow-x-auto">
																												<table className="w-full text-[10.5px] border border-gray-300">
																													<thead className="bg-gray-100 text-black font-semibold">
																														<tr>
																															<th className="border px-3 py-1.5 text-left">
																																Mat
																																Code
																															</th>

																															<th className="border px-3 py-1.5 text-right">
																																Unit
																																Price
																															</th>
																															<th className="border px-3 py-1.5 text-center">
																																Estimate
																																Qty
																															</th>
																															<th className="border px-3 py-1.5 text-right">
																																Estimate
																																Cost
																															</th>
																														</tr>
																													</thead>
																													<tbody>
																														{materialDetails.map(
																															(
																																item,
																																idx,
																															) => (
																																<tr
																																	key={
																																		idx
																																	}
																																	className={
																																		idx %
																																			2 ===
																																		0
																																			? "bg-white"
																																			: "bg-gray-50"
																																	}
																																>
																																	<td className="border px-3 py-1 font-mono">
																																		{item.MatCode?.trim() ||
																																			"—"}
																																	</td>
																																	<td className="border px-3 py-1">
																																		{item.UnitPrice?.toFixed(
																																			2,
																																		) ||
																																			"—"}
																																	</td>
																																	<td className="border px-3 py-1 text-right">
																																		{item.EstimateQty.toFixed(
																																			0,
																																		)}
																																	</td>
																																	<td className="border px-3 py-1 text-center">
																																		{item.EstimateCost?.toFixed(
																																			2,
																																		) ||
																																			"—"}
																																	</td>
																																</tr>
																															),
																														)}
																													</tbody>
																												</table>
																											</div>
																										)}
																									</>
																								)}
																							</div>
																						</td>
																					</tr>
																				)}
																			</React.Fragment>
																		);
																	},
																)}
																{/* Dynamic TOTAL row */}
																<tr className="bg-white font-semibold">
																	<td className="border px-3 py-1.5">
																		TOTAL
																	</td>
																	<td className="border px-3 py-1.5 text-right text-blue-800 font-medium">
																		{formatCurrency(
																			estimateSummary.reduce(
																				(sum, item) => {
																					const resType =
																						item.ResType;
																					const displayCost =
																						resType ===
																						"LABOUR-COST"
																							? (calculatedLabourTotal ??
																								item.TotalEstimateCost)
																							: resType ===
																								  "MAT-COST"
																								? (calculatedMaterialTotal ??
																									item.TotalEstimateCost)
																								: item.TotalEstimateCost;
																					return (
																						sum +
																						(displayCost ||
																							0)
																					);
																				},
																				0,
																			),
																		)}
																	</td>
																</tr>
															</>
														) : (
															<tr>
																<td
																	colSpan={2}
																	className="border px-4 py-6 text-center text-gray-500"
																>
																	No detailed estimate
																	available
																</td>
															</tr>
														)}
													</tbody>
												</table>
											</div>
										</div>
									</div>
								</section>

								{/* ── JOB INFORMATION SECTION ──────────────────────────────────────── */}
								<div className="mt-12">
									<h4 className="text-sm font-bold text-white bg-gradient-to-r from-[#7A0000] to-[#A52A2A] px-3 py-2 border border-gray-300 mb-6">
										Job Information
									</h4>

									<section className="flex flex-col lg:flex-row lg:space-x-8 px-4 gap-y-8 lg:gap-y-0">
										{/* Left Column */}
										<div className="flex-1 lg:max-w-lg xl:max-w-xl space-y-6">
											{/* Job Number & Created Date */}
											<div className="border border-gray-300 p-4 text-xs bg-white">
												<dl className="grid grid-cols-[auto_1fr] lg:grid-cols-[35%_65%] gap-x-4 gap-y-1.5">
													<dt className="font-bold text-gray-700">
														Job Number :
													</dt>
													<dd className="text-gray-900">
														<span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md">
															{selectedRow?.ProjectNo || "—"}
														</span>
													</dd>

													<dt className="font-bold text-gray-700">
														Job Created Date :
													</dt>
													<dd className="text-gray-900">
														{formatDate(
															jobHistory?.JobCreatedDate,
														) || "—"}
													</dd>
												</dl>
											</div>

											{/* Revised Standard Estimate */}
											<div>
												<h5 className="text-sm font-bold text-[#7A0000] mb-2 px-1">
													Revised Standard Estimate
												</h5>
												<div className="overflow-x-auto border border-gray-300">
													<table className="table-auto border-collapse w-full text-xs">
														<thead className="bg-gray-100 text-black font-semibold">
															<tr>
																<th className="border px-3 py-1.5 text-left">
																	Description
																</th>
																<th className="border px-3 py-1.5 text-right">
																	Amount (LKR)
																</th>
															</tr>
														</thead>
														<tbody>
															<tr className="bg-white">
																<td className="border px-3 py-1">
																	Fixed Cost
																</td>
																<td className="border px-3 py-1 text-right">
																	{formatCurrency(
																		detailedEstimate?.FixedCost,
																	)}
																</td>
															</tr>
															<tr className="bg-gray-50">
																<td className="border px-3 py-1">
																	Variable Cost
																</td>
																<td className="border px-3 py-1 text-right">
																	{formatCurrency(
																		detailedEstimate?.VariableCost,
																	)}
																</td>
															</tr>
															<tr className="bg-white">
																<td className="border px-3 py-1">
																	Conversion Cost
																</td>
																<td className="border px-3 py-1 text-right">
																	{formatCurrency(
																		detailedEstimate?.ConversionCost,
																	)}
																</td>
															</tr>
															<tr className="bg-gray-50">
																<td className="border px-3 py-1">
																	Material Cost
																</td>
																<td className="border px-3 py-1 text-right">
																	{formatCurrency(
																		calculatedMaterialTotal ??
																			detailedEstimate?.VariableCost,
																	)}
																</td>
															</tr>
															<tr className="bg-white">
																<td className="border px-3 py-1">
																	Labour Cost
																</td>
																<td className="border px-3 py-1 text-right">
																	{formatCurrency(
																		calculatedLabourTotal ??
																			detailedEstimate?.LabourCost,
																	)}
																</td>
															</tr>
															<tr className="bg-gray-50">
																<td className="border px-3 py-1">
																	Overhead Cost
																</td>
																<td className="border px-3 py-1 text-right">
																	{formatCurrency(
																		detailedEstimate?.OverheadCost,
																	)}
																</td>
															</tr>
															<tr className="bg-white">
																<td className="border px-3 py-1">
																	Transport Cost
																</td>
																<td className="border px-3 py-1 text-right">
																	{formatCurrency(
																		detailedEstimate?.TransportCost,
																	)}
																</td>
															</tr>
															<tr className="bg-gray-50">
																<td className="border px-3 py-1">
																	Contingency Cost
																</td>
																<td className="border px-3 py-1 text-right">
																	{formatCurrency(
																		detailedEstimate?.ContingencyCost,
																	)}
																</td>
															</tr>
															<tr className="bg-white">
																<td className="border px-3 py-1">
																	Board Charge
																</td>
																<td className="border px-3 py-1 text-right">
																	{formatCurrency(
																		detailedEstimate?.BoardCharge,
																	)}
																</td>
															</tr>
															<tr className="bg-gray-50">
																<td className="border px-3 py-1">
																	Damage Cost
																</td>
																<td className="border px-3 py-1 text-right">
																	{formatCurrency(
																		detailedEstimate?.DamageCost,
																	)}
																</td>
															</tr>

															<tr className="bg-gray-50">
																<td className="border px-3 py-1">
																	SSCL
																</td>
																<td className="border px-3 py-1 text-right">
																	{formatCurrency(
																		detailedEstimate?.Sscl,
																	)}
																</td>
															</tr>
															<tr className="bg-white">
																<td className="border px-3 py-1">
																	Security Deposit
																</td>
																<td className="border px-3 py-1 text-right">
																	{formatCurrency(
																		detailedEstimate?.SecurityDeposit,
																	)}
																</td>
															</tr>
															<tr className="bg-gray-50 font-semibold">
																<td className="border px-3 py-1.5">
																	Total
																</td>
																<td className="border px-3 py-1.5 text-right text-blue-800 font-medium">
																	{calculatedLabourTotal !==
																		null &&
																	calculatedMaterialTotal !==
																		null
																		? formatCurrency(
																				(calculatedLabourTotal ||
																					0) +
																					(calculatedMaterialTotal ||
																						0) +
																					(detailedEstimate?.OverheadCost ||
																						0) +
																					(detailedEstimate?.TransportCost ||
																						0),
																			)
																		: formatCurrency(
																				detailedEstimate?.TotalCost,
																			)}
																</td>
															</tr>
														</tbody>
													</table>
												</div>
											</div>

											{/* Energizing */}
											<div className="border border-gray-300 p-4 text-xs bg-white">
												<h5 className="text-sm font-bold text-[#7A0000] mb-3">
													Energizing
												</h5>
												<dl className="grid grid-cols-[auto_1fr] lg:grid-cols-[35%_65%]gap-x-4 gap-y-1.5">
													<dt className="font-bold text-gray-700">
														Job Finalized Date :
													</dt>
													<dd className="text-gray-900">
														{formatDate(
															energizeDate[0]?.finalized_date ||
																null,
														) || "—"}
													</dd>

													<dt className="font-bold text-gray-700">
														Energized Date :
													</dt>
													<dd className="text-gray-900">
														{formatDate(
															energizeDate[0]?.EnergizedDate ||
																null,
														) || "—"}
													</dd>

													<dt className="font-bold text-gray-700">
														Bill Exported Date :
													</dt>
													<dd className="text-gray-900">
														{formatDate(
															energizedInfo?.ExportedDate ||
																null,
														) || "—"}
													</dd>

													<dt className="font-bold text-gray-700">
														Account Created Date :
													</dt>
													<dd className="text-gray-900">
														{formatDate(
															energizedInfo?.AccCreatedDate ||
																null,
														) || "—"}
													</dd>

													<dt className="font-bold text-gray-700">
														Generated Account No :{" "}
													</dt>
													<dd>
														{" "}
														<span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded">
															{energizedInfo?.AccountNo || "—"}
														</span>
													</dd>

													<dt className="font-bold text-gray-700">
														Physical Closed Date :
													</dt>
													<dd className="text-gray-900">
														{formatDate(
															jobHistory?.PhysicalClose,
														) || "—"}
													</dd>

													<dt className="font-bold text-gray-700">
														Financial Closed Date :
													</dt>
													<dd className="text-gray-900">
														{formatDate(jobHistory?.HardClose) ||
															"—"}
													</dd>
												</dl>
											</div>
										</div>

										{/* Right Column */}
										<div className="flex-1 space-y-6">
											{/* Revised Job Approvals */}
											<div>
												<h5 className="text-sm font-bold text-[#7A0000] mb-2 px-1">
													Revised Job Approvals
												</h5>
												<div className="overflow-x-auto border border-gray-300">
													<table className="table-auto border-collapse w-full text-xs">
														<thead className="bg-gray-100 text-black font-semibold">
															<tr>
																<th className="border px-3 py-1.5 text-center">
																	Approved By
																</th>
																<th className="border px-3 py-1.5 text-center">
																	Date
																</th>
																<th className="border px-3 py-1.5 text-center">
																	Time
																</th>
																<th className="border px-3 py-1.5 text-center">
																	Standard Cost
																</th>
																<th className="border px-3 py-1.5 text-center">
																	Detail Cost
																</th>
															</tr>
														</thead>
														<tbody>
															{revisedEstimateApprovals.length >
															0 ? (
																revisedEstimateApprovals.map(
																	(item, index) => (
																		<tr
																			key={index}
																			className={
																				index % 2 === 0
																					? "bg-white"
																					: "bg-gray-50"
																			}
																		>
																			<td className="border px-3 py-1.5 text-center">
																				{item.ApprovedLevel ||
																					"—"}
																			</td>
																			<td className="border px-3 py-1.5 text-center">
																				{item.ApprovedDate
																					? new Date(
																							item.ApprovedDate,
																						).toLocaleDateString()
																					: "—"}
																			</td>
																			<td className="border px-3 py-1.5 text-center">
																				{item.ApprovedTime ||
																					"—"}
																			</td>
																			<td className="border px-3 py-1.5 text-right">
																				{item.StandardCost?.toLocaleString(
																					undefined,
																					{
																						minimumFractionDigits: 2,
																						maximumFractionDigits: 2,
																					},
																				) || "—"}
																			</td>
																			<td className="border px-3 py-1.5 text-right">
																				{item.DetailedCost?.toLocaleString(
																					undefined,
																					{
																						minimumFractionDigits: 2,
																						maximumFractionDigits: 2,
																					},
																				) || "—"}
																			</td>
																		</tr>
																	),
																)
															) : (
																<tr>
																	<td
																		colSpan={5}
																		className="border px-4 py-6 text-center text-gray-500 text-xs"
																	>
																		No revised estimate
																		approvals available
																	</td>
																</tr>
															)}
														</tbody>
													</table>
												</div>
											</div>

											{/* PIV Info */}
											<div>
												<h5 className="text-sm font-bold text-[#7A0000] mb-2 px-1">
													Revised PIV Info
												</h5>
												<div className="overflow-x-auto border border-gray-300">
													<table className="table-auto border-collapse w-full text-[10.5px]">
														<thead className="bg-gray-100 text-black font-semibold">
															<tr>
																<th className="border px-3 py-1.5 text-center">
																	PIV No
																</th>
																<th className="border px-3 py-1.5 text-center">
																	PIV Type
																</th>
																<th className="border px-3 py-1.5 text-center">
																	Amount
																</th>
																<th className="border px-3 py-1.5 text-center">
																	Issued Date
																</th>
																<th className="border px-3 py-1.5 text-center">
																	Paid Date
																</th>
																<th className="border px-3 py-1.5 text-center">
																	Status
																</th>
															</tr>
														</thead>
														<tbody>
															{Array.isArray(pivDetailsJob) &&
															pivDetailsApp.length > 0 ? (
																pivDetailsApp.map(
																	(
																		piv: any,
																		index: number,
																	) => (
																		<tr
																			key={index}
																			className="bg-white hover:bg-gray-50"
																		>
																			<td className="border px-2 py-1 text-center">
																				{piv.PivNo || "—"}
																			</td>
																			<td className="border px-2 py-1 text-center">
																				{piv.PivType || "—"}
																			</td>
																			<td className="border px-2 py-1 text-right">
																				{piv.PivAmount
																					? piv.PivAmount.toLocaleString()
																					: "—"}
																			</td>
																			<td className="border px-2 py-1 text-center">
																				{formatDate(
																					piv.PivDate,
																				) || "—"}
																			</td>
																			<td className="border px-2 py-1 text-center">
																				{formatDate(
																					piv.PaidDate,
																				) || "—"}
																			</td>
																			<td className="border px-2 py-1 text-center">
																				{piv.Status || "—"}
																			</td>
																		</tr>
																	),
																)
															) : (
																<tr>
																	<td
																		colSpan={6}
																		className="border px-4 py-3 text-center text-gray-500"
																	>
																		No PIV data available
																	</td>
																</tr>
															)}
														</tbody>
													</table>
												</div>
											</div>

											<div>
												<h5 className="text-sm font-bold text-[#7A0000] mb-2 px-1">
													Revised Detail Estimate
												</h5>
												<div className="overflow-x-auto border border-gray-300">
													<table className="table-auto border-collapse w-full text-[11px]">
														<thead className="bg-gray-100 text-black font-semibold">
															<tr>
																<th className="border px-3 py-1.5 text-left">
																	Description
																</th>
																<th className="border px-3 py-1.5 text-right">
																	Amount (LKR)
																</th>
															</tr>
														</thead>
														<tbody>
															{estimateSummaryJob.length > 0 ? (
																<>
																	{estimateSummaryJob.map(
																		(item, index) => {
																			const resType =
																				item.ResType;
																			const isLabour =
																				resType ===
																				"LABOUR-COST";
																			const isMaterial =
																				resType ===
																				"MAT-COST";
																			const isExpandable =
																				isLabour ||
																				isMaterial;

																			const expanded =
																				isLabour
																					? isLabourExpandedJob
																					: isMaterial
																						? isMaterialExpandedJob
																						: false;

																			const toggle = isLabour
																				? toggleLabourDetailsJob
																				: isMaterial
																					? toggleMaterialDetailsJob
																					: () => {};

																			const displayCost =
																				isLabour
																					? (calculatedLabourTotalJob ??
																						item.TotalEstimateCost)
																					: isMaterial
																						? (calculatedMaterialTotalJob ??
																							item.TotalEstimateCost)
																						: item.TotalEstimateCost;

																			const loadingText =
																				(isLabour &&
																					labourDetailsJob.length ===
																						0 &&
																					selectedRow?.ApplicationNo) ||
																				(isMaterial &&
																					materialDetailsJob.length ===
																						0 &&
																					selectedRow?.ApplicationNo)
																					? "Loading..."
																					: null;

																			return (
																				<React.Fragment
																					key={index}
																				>
																					<tr
																						className={
																							index %
																								2 ===
																							0
																								? "bg-white"
																								: "bg-gray-50"
																						}
																					>
																						<td
																							className={`border px-3 py-1 ${
																								isExpandable
																									? "cursor-pointer hover:bg-yellow-50 transition-colors"
																									: ""
																							} ${expanded ? "font-semibold" : ""}`}
																							onClick={
																								isExpandable
																									? toggle
																									: undefined
																							}
																						>
																							{isExpandable && (
																								<span className="inline-block w-4 text-center mr-1.5">
																									{expanded
																										? "▼"
																										: "▶"}
																								</span>
																							)}
																							{formatResType(
																								resType,
																							)}
																						</td>
																						<td className="border px-3 py-1 text-right font-medium">
																							{loadingText ||
																								formatCurrency(
																									displayCost,
																								)}
																						</td>
																					</tr>

																					{expanded && (
																						<tr>
																							<td
																								colSpan={
																									2
																								}
																								className="p-0 border-t-0"
																							>
																								<div className="bg-gray-50 p-3">
																									{isLabour && (
																										<>
																											{labourDetailsJob.length ===
																											0 ? (
																												<div className="text-center py-6 text-gray-500">
																													No
																													labour
																													details
																													available
																												</div>
																											) : (
																												<div className="overflow-x-auto">
																													<table className="w-full text-[10.5px] border border-gray-300">
																														<thead className="bg-gray-100 text-black font-semibold">
																															<tr>
																																<th className="border px-3 py-1.5 text-left">
																																	Labour
																																	Code
																																</th>
																																<th className="border px-3 py-1.5 text-left">
																																	Description
																																</th>
																																<th className="border px-3 py-1.5 text-center">
																																	Unit
																																	Lab.
																																	Hrs.
																																</th>
																																<th className="border px-3 py-1.5 text-center">
																																	Qty
																																</th>
																																<th className="border px-3 py-1.5 text-right">
																																	Rate
																																</th>
																																<th className="border px-3 py-1.5 text-right">
																																	Cost
																																</th>
																															</tr>
																														</thead>
																														<tbody>
																															{labourDetailsJob.map(
																																(
																																	item,
																																	idx,
																																) => (
																																	<tr
																																		key={
																																			idx
																																		}
																																		className={
																																			idx %
																																				2 ===
																																			0
																																				? "bg-white"
																																				: "bg-gray-50"
																																		}
																																	>
																																		<td className="border px-3 py-1 font-mono">
																																			{item.LabourCode ||
																																				"—"}
																																		</td>
																																		<td className="border px-3 py-1">
																																			{item.ActivityDescription ||
																																				"—"}
																																		</td>
																																		<td className="border px-3 py-1 text-center">
																																			{item.UnitLabourHrs?.toFixed(
																																				1,
																																			) ||
																																				"—"}
																																		</td>
																																		<td className="border px-3 py-1 text-center">
																																			{item.ItemQty?.toFixed(
																																				1,
																																			) ||
																																				"—"}
																																		</td>
																																		<td className="border px-3 py-1 text-right">
																																			{formatCurrency(
																																				item.UnitPrice,
																																			)}
																																		</td>
																																		<td className="border px-3 py-1 text-right font-medium">
																																			{formatCurrency(
																																				item.CebLabourCost,
																																			)}
																																		</td>
																																	</tr>
																																),
																															)}
																														</tbody>
																													</table>
																												</div>
																											)}
																										</>
																									)}

																									{isMaterial && (
																										<>
																											{materialDetailsJob.length ===
																											0 ? (
																												<div className="text-center py-6 text-gray-500">
																													No
																													material
																													transactions
																													available
																												</div>
																											) : (
																												<div className="overflow-x-auto">
																													<table className="w-full text-[10.5px] border border-gray-300">
																														<thead className="bg-gray-100 text-black font-semibold">
																															<tr>
																																<th className="border px-3 py-1.5 text-left">
																																	Mat
																																	Code
																																</th>
																																<th className="border px-3 py-1.5 text-right">
																																	Unit
																																	Price
																																</th>
																																<th className="border px-3 py-1.5 text-center">
																																	Estimate
																																	Qty
																																</th>
																																<th className="border px-3 py-1.5 text-right">
																																	Estimate
																																	Cost
																																</th>
																															</tr>
																														</thead>
																														<tbody>
																															{materialDetailsJob.map(
																																(
																																	item,
																																	idx,
																																) => (
																																	<tr
																																		key={
																																			idx
																																		}
																																		className={
																																			idx %
																																				2 ===
																																			0
																																				? "bg-white"
																																				: "bg-gray-50"
																																		}
																																	>
																																		<td className="border px-3 py-1 font-mono">
																																			{item.MatCode?.trim() ||
																																				"—"}
																																		</td>
																																		<td className="border px-3 py-1">
																																			{item.UnitPrice?.toFixed(
																																				2,
																																			) ||
																																				"—"}
																																		</td>
																																		<td className="border px-3 py-1 text-right">
																																			{item.EstimateQty.toFixed(
																																				0,
																																			)}
																																		</td>
																																		<td className="border px-3 py-1 text-center">
																																			{item.EstimateCost?.toFixed(
																																				2,
																																			) ||
																																				"—"}
																																		</td>
																																	</tr>
																																),
																															)}
																														</tbody>
																													</table>
																												</div>
																											)}
																										</>
																									)}
																								</div>
																							</td>
																						</tr>
																					)}
																				</React.Fragment>
																			);
																		},
																	)}

																	{/* Dynamic TOTAL row – using job-specific totals */}
																	<tr className="bg-white font-semibold">
																		<td className="border px-3 py-1.5">
																			TOTAL
																		</td>
																		<td className="border px-3 py-1.5 text-right text-blue-800 font-medium">
																			{formatCurrency(
																				estimateSummaryJob.reduce(
																					(sum, item) => {
																						const resType =
																							item.ResType;
																						const displayCost =
																							resType ===
																							"LABOUR-COST"
																								? (calculatedLabourTotalJob ??
																									item.TotalEstimateCost)
																								: resType ===
																									  "MAT-COST"
																									? (calculatedMaterialTotalJob ??
																										item.TotalEstimateCost)
																									: item.TotalEstimateCost;
																						return (
																							sum +
																							(displayCost ||
																								0)
																						);
																					},
																					0,
																				),
																			)}
																		</td>
																	</tr>
																</>
															) : (
																<tr>
																	<td
																		colSpan={2}
																		className="border px-4 py-6 text-center text-gray-500"
																	>
																		No revised detailed
																		estimate available
																	</td>
																</tr>
															)}
														</tbody>
													</table>
												</div>
											</div>
											{/* Contractor Bill Info */}
											<div className="border border-gray-300 p-4 text-xs bg-white">
												<h5 className="text-sm font-bold text-[#7A0000] mb-3">
													Contractor Bill Info
												</h5>
												<dl className="grid grid-cols-[auto_1fr] lg:grid-cols-[35%_65%] gap-x-4 gap-y-1.5">
													<dt className="font-bold text-gray-700">
														Contractor Name :
													</dt>
													<dd className="text-gray-900">
														{contractorInfo?.ContractorName ||
															"—"}
													</dd>

													<dt className="font-bold text-gray-700">
														Contractor Allocated Date :
													</dt>
													<dd className="text-gray-900">
														{formatDate(
															contractorInfo?.AllocatedDate,
														) || "—"}
													</dd>

													<dt className="font-bold text-gray-700">
														Contractor Bill No. :
													</dt>
													<dd className="text-gray-900">
														{contractorBills?.ContractorBillNo ||
															"—"}
													</dd>

													<dt className="font-bold text-gray-700">
														Contractor Bill Date :
													</dt>
													<dd className="text-gray-900">
														{contractorBills?.ContractorBillDate
															? formatDate(
																	contractorBills?.ContractorBillDate,
																)
															: "—"}
													</dd>
												</dl>
											</div>
										</div>
									</section>
								</div>

								<div className="px-6 py-5 bg-gray-50 flex justify-end mb-2">
									<button
										onClick={onClose}
										className="px-4 py-2 bg-gradient-to-r from-[#7A0000] to-[#A52A2A] text-white font-medium rounded-lg shadow hover:brightness-110 transition focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
									>
										Close
									</button>
								</div>
							</>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};;

export default JobSearchDetails;
