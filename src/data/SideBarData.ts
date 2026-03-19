import {MdPayment, MdPower} from "react-icons/md";
import {RiBankLine} from "react-icons/ri";
import {FaBoxes, FaFileInvoiceDollar} from "react-icons/fa";
import {BsFolder2Open} from "react-icons/bs";
import {MdAssignmentTurnedIn} from "react-icons/md";
import {GiSolarPower} from "react-icons/gi";
import {FaBalanceScale} from "react-icons/fa";
import {FiBriefcase} from "react-icons/fi";
import {FaBookOpen} from "react-icons/fa";
import {MdBuild} from "react-icons/md";
import {FaArrowDownShortWide} from "react-icons/fa6";
import {MdInventory2} from "react-icons/md";
import {FaMoneyCheckAlt} from "react-icons/fa";
import {TbReportAnalytics} from "react-icons/tb";

export const data = [
	{
		id: 1,
		name: "General",
		icon: MdPayment,
		subtopics: [
			{id: 1, name: "Bill calculation"},
			{id: 3, name: "Listing of customers"},
			{id: 4, name: "List of government accounts"},
			{id: 5, name: "Largest 100 customer details"},
			{id: 8, name: "Sequence change accounts"},
			{id: 9, name: "Retails Journal"},
			{id: 10, name: "Arrears position – meter reader wise"},
			{id: 11, name: "List of customers (enlisted in Master Invoices)"},
			{id: 12, name: "Disconnection list"},
			{id: 13, name: "Shakthi LED distribution summary"},
			{id: 14, name: "Active customers and sales by tariff"},
			{id: 15, name: "Standing order report"},
			{id: 17, name: "Registered consumers for SMS alerts"},
			{id: 1019, name: "Finalized Accounts"},
			{id: 1020, name: "Outstanding Dues"},
			{id: 1021, name: "Largest Consumption"},
			{id: 1022, name: "Security deposit & Contract Demand - Bulk"},
		],
		path: "/report/general",
	},
	{
		id: 2,
		name: "Customer Details",
		icon: RiBankLine,
		subtopics: [
			{id: 19, name: "Customer Information"},
			{id: 1020, name: "Transaction History"},
			{id: 1021, name: "Bill Information"},
			{id: 1022, name: "Payment inquiries"},
			{id: 1023, name: "Bill SMS Inquiry"},
			{id: 1024, name: "Arrears Position – Single customer"},
			{id: 1025, name: "Suspense Payment"},
		],
		path: "/report/billing-payment",
	},
	{
		id: 3,
		name: "Analysis",
		icon: FaBoxes,
		subtopics: [
			{id: 27, name: "Total Debtors Analysis"},
			{id: 23, name: "Debtors Age Analysis (Individual Customers)"},
			{id: 24, name: "Transaction analysis"},
			{id: 25, name: "Transaction analysis (incl. Prov. Data)"},
			{id: 26, name: "Age analysis for solar customer"},

			// { id: 28, name: "Debtors age analysis (individual customers)" },
			{id: 29, name: "Financial analysis"},
			{id: 30, name: "Assessed unit analysis"},
			// { id: 32, name: "unit analysis" },
			{id: 1028, name: "Age Analysis – Bulk"},
			{id: 1029, name: "Consumption Pattern Analysis"},
		],
		path: "/report/analysis",
	},
	{
		id: 4,
		name: "Collections",
		icon: BsFolder2Open,
		subtopics: [
			{id: 31, name: "Online counter collections"},
			{id: 32, name: "Sales and collection"},
			{id: 33, name: "Stamp duty for payment collections"},
			{id: 34, name: "Monthly revenue collection of different channels"},
			{id: 35, name: "Kiosk 	payment collection"},
			{id: 36, name: "Payment collection"},
			{id: 37, name: "Suspense payment details"},
			{id: 38, name: "Finalized account details"},
			{id: 39, name: "Written off account details"},
			{id: 40, name: "Receivable position"},
			{id: 41, name: "Unload loan information"},
			{id: 42, name: "Dishonoured cheques"},
		],
		path: "/report/collections",
	},
	{
		id: 5,
		name: "Consumption Analysis",
		icon: MdAssignmentTurnedIn,
		subtopics: [
			//{id: 43, name: "Consumer consumption analysis"},
			//{id: 44, name: "Tariff category wise consumption analysis"},
			//{id: 47, name: "Consumption pattern analysis"},
			//{id: 48, name: "Assessed meter reading details"},
			//{id: 49, name: "Zero consumption details"},
			{id: 1026, name: "Tariff Block Wise Consumption Report"},
			{id: 43, name: "Tariff and Block wise Consumption Analysis"},
			{id: 44, name: "Transformer wise Consumption Analysis"},
			{id: 45, name: "Business Category wise Consumption Analysis"},
		],
		path: "/report/consumption-analysis",
	},
	{
		id: 6,
		name: "Solar Information – Billing",
		icon: GiSolarPower,
		subtopics: [
			{id: 50, name: "Solar PV billing information"},
			{id: 51, name: "Solar PV capacity information"},
			{id: 52, name: "Solar progress clarification – Ordinary"},
			{id: 53, name: "Solar progress clarification – Bulk"},
			{id: 54, name: "Solar payment information – retail"},
			{id: 55, name: "Solar payment information – Bulk"},
			{
				id: 56,
				name: "Solar connection details (incl. Reading and usage) - retail",
			},
			{
				id: 57,
				name: "Solar connection details (incl. Reading and usage) - bulk",
			},
			{id: 58, name: "Solar customer information"},
			{
				id: 1027,
				name: "Rooftop Solar Input Data portal for T and D Loss Calculation",
			},
		],
		path: "/report/solar-information",
	},

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

		path: "/report/trialBalance",
	},
	{
		id: 10,
		name: "Income & Expenditure",
		icon: FaArrowDownShortWide,
		subtopics: [
			{id: 90, name: "Cost Center Wise Income & Expenditure"},
			{id: 91, name: "Province Wise Income & Expenditure"},
			{id: 92, name: "Region Wise Income & Expenditure"},
			{id: 93, name: "Region Wise Income & Expenditure (Detailed)"},
		],
		path: "/report/IncomeExpenditure",
	},

	{
		id: 11,
		name: "Work In Progress",
		icon: MdBuild,
		subtopics: [
			{id: 109, name: "Cost Center Wise Work In Progress With Age Analysis"},
			{
				id: 110,
				name: "Cost Center Wise Work In Progress ( Completed Projects )",
			},
		],

		path: "/report/WorkInProgress",
	},

	//Sidebar data for the JobCard
	{
		id: 12,
		name: "Jobs",
		icon: FiBriefcase,
		subtopics: [
			{id: 111, name: "Job Card Details"},
			{id: 119, name: "Job Card -  Material Details"},
			{id: 400, name: "Job Search - Orinary"},
		],

		path: "/report/jobs",
	},
	

	{
		id: 13,
		name: "Ledger Cards",
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
];
