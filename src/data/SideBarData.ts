import type { ComponentType } from "react";
import { MdPayment, MdPower, MdAssignmentTurnedIn, MdBuild, MdInventory2, MdDashboard } from "react-icons/md";
import { RiBankLine } from "react-icons/ri";
import { FaBoxes, FaFileInvoiceDollar, FaBalanceScale, FaBookOpen, FaMoneyCheckAlt } from "react-icons/fa";
import { BsFolder2Open } from "react-icons/bs";
import { GiSolarPower } from "react-icons/gi";
import { FiBriefcase } from "react-icons/fi";
import { FaArrowDownShortWide } from "react-icons/fa6";
import { TbReportAnalytics } from "react-icons/tb";

type ApiEnvelope<T> = {
  data: T;
  errorMessage: string | null;
};

type RoleLikeObject = {
  RoleId?: unknown;
  roleId?: unknown;
  roleid?: unknown;
  UserNo?: unknown;
  userNo?: unknown;
  userno?: unknown;
  EPFNo?: unknown;
  EpfNo?: unknown;
  epfNo?: unknown;
  epfno?: unknown;
};

	{
		id: 17,
		name: "Solar Information - Jobs",
		icon: GiSolarPower,
		subtopics: [
			{id: 1400, name: "Area-wise Solar Sent to Billing Details"},
			{id: 1410, name: "Solar Retail Rooftop Pending Jobs after PIV2 Paid"},
		],
		path: "/report/SolarInformationJobs",
	},
	{
		id: 7,
		name: "PUCSL/LISS",
		icon: GiSolarPower,
		subtopics: [
			{id: 59, name: "LISS submission – retail journal adjustments"},
			{id: 60, name: "PUCSL Reports (LISS Data)"},
			{id: 61, name: "PUCSL Reports – solar connections (New)"},
			{id: 62, name: "Solar data for UNT calculation"},
		],
		path: "/report/pucsl-liss",
	},
	{
		id: 8,
		name: "Inventory",
		icon: MdInventory2,
		subtopics: [
			{id: 59, name: "Material Details"},
			{id: 101, name: "Cost Center wise Quantity on Hand"},
			{id: 100, name: "Average Consumptions - All Material Codes"},
			{id: 102, name: "Average Consumptions - Selected Maerial Codes"},
			{id: 103, name: "Province wise Quantity on Hand"},
			{id: 103, name: "Provincial Quantity on Hand - Cross Tab"},
			{
				id: 104,
				name: "Quantity on Hand All Region Material (Active ,Online )",
			},
		],
		path: "/report/inventory",
	},
	{
		id: 9,
		name: "Trial Balance",
		icon: FaBalanceScale,
		subtopics: [
			{id: 60, name: "Cost Center Trial Balance - End of Month/Year"},
			{id: 61, name: "Provintial Trial Balance - End of Month/Year"},
			{id: 62, name: "Region Trial Balance - End of Month/Year"},
		],
type RoleReportApiItem = {
  RepIdNo?: unknown;
  CategoryName?: unknown;
  ReportName?: unknown;
  repIdNo?: unknown;
  categoryName?: unknown;
  reportName?: unknown;
  repid_no?: unknown;
  catname?: unknown;
  repname?: unknown;
};

type CategoryConfig = {
  icon: TopicIcon;
  path: string;
};

export type TopicIcon = ComponentType<{ className?: string }>;

export type Subtopic = {
  id: number;
  repIdNo: string;
  name: string;
};

export type Topic = {
  id: number;
  name: string;
  icon: TopicIcon;
  subtopics: Subtopic[];
  path: string;
};

export type SidebarResult = {
  data: Topic[];
  message: string | null;
};

	{
		id: 13,
		icon: FaBookOpen,
		subtopics: [
			{id: 112, name: "Ledger Card with Subaccounts"},
			{id: 113, name: "Ledger Card without Subaccounts"},
			{id: 114, name: "Ledger Card  Subaccounts Total"},
			{
				id: 115,
				name: "Sub Accounts Transactions for Account Code within Selected Company",
			},
		],

		path: "/report/LedgerCards",
	},

	{
		id: 14,
		name: "Cash Book",
		icon: FaMoneyCheckAlt,
		subtopics: [
			{id: 116, name: "Selected Payee Within Date Range"},
			{id: 117, name: "Cost Center Wise Selected Payee Within Date Range"},
			{
				id: 118,
				name: "Cost Center Wise Document Inquiry Cash Book With Cheque Details",
			},
		],

		path: "/report/CashBook",
	},

	{
		id: 15,
		name: "PIV",
		icon: TbReportAnalytics,
		subtopics: [
			{
				id: 119,
				name: "1. Branch/Province wise PIV Collections Paid to Bank",
			},
			{
				id: 120,
				name: "2. Branch/Province wise PIV Collections by Provincial POS relevant to the Province",
			},
			{
				id: 121,
				name: "3. Branch/Province wise PIV Collections Paid to Provincial POS",
			},
			{
				id: 122,
				name: "4. PIV Collections by Provincial POS relevant to Other Cost Centers",
			},
			{
				id: 123,
				name: "5. PIV Collections by Other Cost Centers relevant to the Province",
			},
			{
				id: 124,
				name: "6. Branch wise PIV Tabulation ( Both Bank and POS)",
			},
			{
				id: 127,
				name: "7. PIV Collections by Banks",
			},
			{
				id: 125,
				name: "7.1 PIV Collections by Peoples Banks",
			},
			{
				id: 126,
				name: "7.2 PIV Collections by IPG  (SLT) ",
			},
			{
				id: 128,
				name: "8. PIV Details Report (PIV Amount not tallied with Paid Amount)",
			},
			{
				id: 129,
				name: "9. Province wise PIV Stamp Duty",
			},
			{
				id: 150,
				name: "10. Regional PIV Stamp Duty",
			},
			{
				id: 151,
				name: "11. PIV Details for Cheque Deposits",
			},
			{
				id: 152,
				name: "12. PIV Search",
			},
			{
				id: 153,
				name: "13. PIV Type wise PIV Details",
			},
			{
				id: 154,
				name: "14. Consolidated Output VAT Schedule",
			},
			{
				id: 155,
				name: "15. PIV Stamp Duty Detail Report",
			},
			{
				id: 156,
				name: "16. Province wise VAT Report",
			},
			{
				id: 157,
				name: "17. Region wise VAT Report",
			},
			{
				id: 158,
				name: "18. Province wise System Set-Off PIV Details",
			},
			{
				id: 159,
				name: "18.1 Province wise Manual Set-Off PIV Details",
			},
			{
				id: 160,
				name: "19. POS Paid PIV Tabulation Summary Report (AFMHQ)",
			},
			{
				id: 161,
				name: "20. PIV Details (Issued and Paid Cost Centers AFMHQ Only)",
			},
			{
				id: 162,
				name: "21. PIV Details (Paid Cost center: 913.00 and Issued Other Company)",
			},
			{
				id: 163,
				name: "22. Refunded PIV Details",
			},
			{
				id: 164,
				name: "23. Region wise PIV Collections by Provincial POS relevant to Other Cost Centers",
			},
			{
				id: 165,
				name: "24. Bank PIV Tabulation",
			},
			{
				id: 166,
				name: "25. Bank Paid Piv Details",
			},
			{
				id: 167,
				name: "26. Cost Center wise PIV Details (Status Report)",
			},
		],
		path: "/report/PIV",
	},

	{
		id: 16,
		name: "Physical Verification",
		icon: TbReportAnalytics,
		subtopics: [
			{id: 130, name: "1. PHV Entry Form"},

			{id: 131, name: "2.1 PHV Validation"},

			{id: 132, name: "2.2 PHV Validation (Warehousewise)"},


			{id: 133, name: "3.1 Annual Verification Sheet (Signature) - AV/1/A"},

			{
				id: 134,
				name: "3.2 Annual Verification sheet (WHwise Signature) - AV/1/A",
			},

			{
				id: 135,
				name: "4. Physical Verification Non-Moving / Slow-Moving WH wise AV/6",
			},

			{
				id: 136,
				name: "5. Physical Verification Shortage / Surplus WH wise AV/1/B",
			},

			{
				id: 137,
				name: "6.1 Physical Verification Obsolete / Idle(GRADE Code) AV/7A",
			},

			{id: 138, name: "6.2 Physical Verification Damage AV/7B"},

			{
				id: 139,
				name: "7. Physical Verification Non-Moving WH wise.BOS - AV/6/BOS",
			},

			{
				id: 140,
				name: "8. Physical Verification Obsolete Idle BOS - AV/7A/BOS",
			},

			{id: 141, name: "9. Physical Verification Damage BOS - AV/7B/BOS"},

			{id: 142, name: "10. Last Document No - Selected Year"},
		],

		path: "/report/PhysicalVerification",
	},

	{
		id: 18,
		name: "Billing Finance Reports",
		icon: FaFileInvoiceDollar,
		subtopics: [
			{id: 1032, name: "Financial statement Reports"},
			{id: 1033, name: "Financial Reports"},
		],
		path: "/report/billing-finance-reports",
	},
	{
		id: 19,
		name: "Transmission Billing",
		icon: MdPower,
		subtopics: [
			{
				id: 1034,
				name: "Monthly Energy Sales (Assessed units taken from consolidated data)",
			},
			{
				id: 1035,
				name: "Monthly Energy Sales (Assessed units taken from provincial data)",
			},
		],
		path: "/report/transmission-billing",
	},
	{
		id: 20,
		name: "Solar Religious Purpose (SRP)",
		icon: GiSolarPower,
		subtopics: [
			{id: 1036, name: "Area Wise SRP Application PIV (PIVI) To be Paid Report"},
			{id: 1037, name: "Area Wise SRP Application PIV Status Report"},
			{id: 1038, name: "Area Wise SRP Estimation PIV (PIVII) To be Paid Report"},
			{
				id: 1036,
				name: "Area Wise SRP Application PIV (PIVI) To be Paid Report",
			},

			{id: 1037, name: "Area Wise SRP Application PIV (PIVI) Paid Report"},

			{
				id: 1039,
				name: "Division Wise SRP Application PIV (PIVI) To be Paid Report",
			},

			{id: 1041, name: "Area Wise SRP Estimation PIV (PIVII) Paid Report"},
		],
		path: "/report/SRP",
	},

	// id: 21 is used above for the job search report
const USER_ROLE_ENDPOINTS = [
  "/misreportsapi/api/userrole",
];
const ROLE_REPORTS_ENDPOINTS = [
  "http://localhost:44381/api/reprolereports/get",
];

const DEFAULT_CATEGORY_CONFIG: CategoryConfig = {
  icon: TbReportAnalytics,
  path: "/report/reports",
};

// Backward-compatibility export for existing imports until all pages are moved to API-loaded data.
export const data: Topic[] = [];

export const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  Dashboard: { icon: MdDashboard, path: "/dashboard" },
  DashBoard: { icon: MdDashboard, path: "/dashboard" },
  "Main Dashboard": { icon: MdDashboard, path: "/dashboard" },
  General: { icon: MdPayment, path: "/report/general" },
  "Customer Details": { icon: RiBankLine, path: "/report/billing-payment" },
  Analysis: { icon: FaBoxes, path: "/report/analysis" },
  Collections: { icon: BsFolder2Open, path: "/report/collections" },
  "Consumption Analysis": { icon: MdAssignmentTurnedIn, path: "/report/consumption-analysis" },
  "Solar Information - Billing": { icon: GiSolarPower, path: "/report/solar-information" },
  "Solar Information Billing": { icon: GiSolarPower, path: "/report/solar-information" },
  "Solar Information - Jobs": { icon: GiSolarPower, path: "/report/SolarInformationJobs" },
  "PUCSL/LISS": { icon: GiSolarPower, path: "/report/pucsl-liss" },
  Inventory: { icon: MdInventory2, path: "/report/inventory" },
  "Trial Balance": { icon: FaBalanceScale, path: "/report/trialBalance" },
  "Income & Expenditure": { icon: FaArrowDownShortWide, path: "/report/IncomeExpenditure" },
  "Work In Progress": { icon: MdBuild, path: "/report/WorkInProgress" },
  Jobs: { icon: FiBriefcase, path: "/report/jobs" },
  "Ledger Cards": { icon: FaBookOpen, path: "/report/LedgerCards" },
  "Cash Book": { icon: FaMoneyCheckAlt, path: "/report/CashBook" },
  PIV: { icon: TbReportAnalytics, path: "/report/PIV" },
  "PIV Details": { icon: TbReportAnalytics, path: "/report/PIV" },
  "Physical Verification": { icon: TbReportAnalytics, path: "/report/PhysicalVerification" },
  "Billing Finance Reports": { icon: FaFileInvoiceDollar, path: "/report/billing-finance-reports" },
  "Transmission Billing": { icon: MdPower, path: "/report/transmission-billing" },
  "Solar Religious Purpose (SRP)": { icon: GiSolarPower, path: "/report/SRP" },
};

const normalizeCategoryKey = (value: string): string =>
  value
    .trim()
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s*-\s*/g, " - ")
    .replace(/\s+/g, " ");

const normalizeText = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\s+/g, " ");
};

const toSlug = (value: string): string => {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  return slug || "reports";
};

const toIdNumber = (repIdNo: string, fallback: number): number => {
  const parsed = Number.parseInt(repIdNo, 10);
  if (Number.isFinite(parsed)) {
    return parsed;
  }

  return fallback;
};

const normalizeId = (value: string): string => value.trim().toLowerCase();

const readUserIdFromObject = (value: RoleLikeObject): string | null => {
  const raw =
    value.UserNo ??
    value.userNo ??
    value.userno ??
    value.EPFNo ??
    value.EpfNo ??
    value.epfNo ??
    value.epfno;

  if (raw === undefined || raw === null) {
    return null;
  }

  const userId = String(raw).trim();
  return userId.length > 0 ? userId : null;
};

const readRoleIdFromObject = (value: RoleLikeObject): string | null => {
  const raw = value.RoleId ?? value.roleId ?? value.roleid;
  if (raw === undefined || raw === null) {
    return null;
  }

  const roleId = String(raw).trim();
  return roleId.length > 0 ? roleId : null;
};

const extractRoleIds = (value: unknown, epfNo?: string): string[] => {
  const roleIds = new Set<string>();
  const normalizedEpfNo = epfNo ? normalizeId(epfNo) : "";

  const addRoleId = (raw: unknown) => {
    if (raw === undefined || raw === null) {
      return;
    }

    const roleId = String(raw).trim();
    if (roleId.length > 0) {
      roleIds.add(roleId);
    }
  };

  if (typeof value === "string" || typeof value === "number") {
    addRoleId(value);
    return Array.from(roleIds);
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === "string" || typeof item === "number") {
        addRoleId(item);
        continue;
      }

      if (item && typeof item === "object") {
        const roleObject = item as RoleLikeObject;
        const userId = readUserIdFromObject(roleObject);
        const isMatchingUser =
          !normalizedEpfNo ||
          !userId ||
          normalizeId(userId) === normalizedEpfNo;

        if (!isMatchingUser) {
          continue;
        }

        const roleId = readRoleIdFromObject(roleObject);
        if (roleId) {
          roleIds.add(roleId);
        }
      }
    }

    return Array.from(roleIds);
  }

  if (value && typeof value === "object") {
    const roleObject = value as RoleLikeObject;
    const userId = readUserIdFromObject(roleObject);
    const isMatchingUser =
      !normalizedEpfNo ||
      !userId ||
      normalizeId(userId) === normalizedEpfNo;

    if (!isMatchingUser) {
      return [];
    }

    const roleId = readRoleIdFromObject(roleObject);
    if (roleId) {
      roleIds.add(roleId);
    }
  }

  return Array.from(roleIds);
};

const toRoleReportItems = (value: unknown): RoleReportApiItem[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item) => item && typeof item === "object") as RoleReportApiItem[];
};

const getReportRepId = (report: RoleReportApiItem): string =>
  String(report.RepIdNo ?? report.repIdNo ?? report.repid_no ?? "").trim();

const getReportCategoryName = (report: RoleReportApiItem): string =>
  normalizeCategoryKey(
    normalizeText(report.CategoryName ?? report.categoryName ?? report.catname)
  );

const getReportName = (report: RoleReportApiItem): string =>
  normalizeText(report.ReportName ?? report.reportName ?? report.repname);

const getCategoryConfig = (categoryName: string): CategoryConfig => {
  const normalized = normalizeCategoryKey(categoryName);
  const configured =
    CATEGORY_CONFIG[normalized] ??
    Object.entries(CATEGORY_CONFIG).find(
      ([key]) => normalizeCategoryKey(key).toLowerCase() === normalized.toLowerCase()
    )?.[1];
  if (configured) {
    return configured;
  }

  return {
    icon: DEFAULT_CATEGORY_CONFIG.icon,
    path: `/report/${toSlug(normalized)}`,
  };
};

export const buildTopics = (roleReports: RoleReportApiItem[]): Topic[] => {
  const grouped = new Map<string, RoleReportApiItem[]>();

  for (const report of roleReports) {
    const categoryName = getReportCategoryName(report);
    const reportName = getReportName(report);
    if (!categoryName || !reportName) {
      continue;
    }

    if (!grouped.has(categoryName)) {
      grouped.set(categoryName, []);
    }

    grouped.get(categoryName)?.push({
      RepIdNo: report.RepIdNo,
      CategoryName: categoryName,
      ReportName: reportName,
    });
  }

  const topics: Topic[] = [];
  let topicIndex = 1;

  for (const [categoryName, reports] of grouped.entries()) {
    const { icon, path } = getCategoryConfig(categoryName);
    const usedSubtopicIds = new Set<number>();

    const subtopics: Subtopic[] = reports.map((report, index) => {
      const repIdNo = getReportRepId(report);
      const fallbackId = topicIndex * 1000 + index + 1;
      let id = toIdNumber(repIdNo, fallbackId);

      while (usedSubtopicIds.has(id)) {
        id += 1;
      }

      usedSubtopicIds.add(id);

      return {
        id,
        repIdNo,
        name: getReportName(report),
      };
    });

    topics.push({
      id: topicIndex,
      name: categoryName,
      icon,
      path,
      subtopics,
    });

    topicIndex += 1;
  }

  topics.sort((a, b) => {
    const aIsDashboard = a.path.toLowerCase() === "/dashboard";
    const bIsDashboard = b.path.toLowerCase() === "/dashboard";

    if (aIsDashboard && !bIsDashboard) {
      return -1;
    }

    if (!aIsDashboard && bIsDashboard) {
      return 1;
    }

    return 0;
  });

  return topics;
};

const fetchJson = async <T>(url: string): Promise<ApiEnvelope<T>> => {
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  let payload: ApiEnvelope<T> | null = null;

  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    // Intentionally ignored, handled below with a friendly message.
  }

  if (!response.ok) {
    const errorMessage = payload?.errorMessage?.trim();
    const httpMessage = errorMessage || `Request failed (${response.status})`;
    throw new Error(httpMessage);
  }

  if (!payload) {
    throw new Error("Received an invalid response from the server.");
  }

  return payload;
};

const fetchJsonFromCandidates = async <T>(urls: string[]): Promise<ApiEnvelope<T>> => {
  let lastError: Error | null = null;

  for (const url of urls) {
    try {
      return await fetchJson<T>(url);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Request failed.");
    }
  }

  throw lastError ?? new Error("Request failed.");
};

export const loadRoleBasedSidebarData = async (epfNo: string): Promise<SidebarResult> => {
  const trimmedEpfNo = epfNo.trim();

  if (!trimmedEpfNo) {
    return {
      data: [],
      message: "Unable to load reports because user information is missing.",
    };
  }

  try {
    const roleResponse = await fetchJsonFromCandidates<unknown>(
      USER_ROLE_ENDPOINTS.map(
        (endpoint) => `${endpoint}/${encodeURIComponent(trimmedEpfNo)}`
      )
    );

    if (roleResponse.errorMessage) {
      return {
        data: [],
        message: roleResponse.errorMessage,
      };
    }

    const roleIds = extractRoleIds(roleResponse.data, trimmedEpfNo);
    if (roleIds.length === 0) {
      return {
        data: [],
        message: "No role was assigned to this user.",
      };
    }

    const allReports: RoleReportApiItem[] = [];

    for (const roleId of roleIds) {
      const reportsResponse = await fetchJsonFromCandidates<unknown>(
        ROLE_REPORTS_ENDPOINTS.map(
          (endpoint) => `${endpoint}?roleId=${encodeURIComponent(roleId)}`
        )
      );

      if (reportsResponse.errorMessage) {
        continue;
      }

      allReports.push(...toRoleReportItems(reportsResponse.data));
    }

    const reportsByKey = new Map<string, RoleReportApiItem>();
    for (const report of allReports) {
      const repIdNo = getReportRepId(report);
      const categoryName = getReportCategoryName(report);
      const reportName = getReportName(report);

      if (!categoryName || !reportName) {
        continue;
      }

      const dedupeKey = `${repIdNo}::${categoryName}::${reportName}`;
      if (!reportsByKey.has(dedupeKey)) {
        reportsByKey.set(dedupeKey, {
          RepIdNo: repIdNo,
          CategoryName: categoryName,
          ReportName: reportName,
        });
      }
    }

    const reports = Array.from(reportsByKey.values());
    const topics = buildTopics(reports);

    if (topics.length === 0) {
      return {
        data: [],
        message: "No reports are available for your role.",
      };
    }

    return {
      data: topics,
      message: null,
    };
  } catch {
    return {
      data: [],
      message: "Failed to load sidebar reports. Please try again in a moment.",
    };
  }
};