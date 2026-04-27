import type { ComponentType } from "react";

// PIV reports
import ProvincePIV from "../mainTopics/PIV/ProvincePIV";
import ProvincePIVProvincial from "../mainTopics/PIV/ProvincePIVProvincial";
import ProvincePIVAll from "../mainTopics/PIV/ProvincePIVAll";
import ProvincePivOtherCC from "../mainTopics/PIV/ProvincePivOtherCC";
import OtherCCtoProvince from "../mainTopics/PIV/OtherCCtoProvince";
import BranchWisePivBoth from "../mainTopics/PIV/BranchWisePivBoth";
import PivByBanks from "../mainTopics/PIV/PivByBanks";
import PIVCollectionsByPeoplesBank from "../mainTopics/PIV/PIVCollectionsByPeoplesBank";
import PivBySLT from "../mainTopics/PIV/PIVCollectionsBySLT";
import PIVDetailsReport from "../mainTopics/PIV/PIVDetailsReport";
import ProvinceWisePIVStampDuty from "../mainTopics/PIV/ProvinceWisePIVStampDuty";
import RegionalPIVStampDutyReport from "../mainTopics/PIV/RegionalPIVStampDutyReport";
import PivChequeDepositReport from "../mainTopics/PIV/PivChequeDepositReport";
import PivSearchReport from "../mainTopics/PIV/PivSearchReport";
import TypewisePIV from "../mainTopics/PIV/TypewisePIV";
import ConsolidatedOutputVAT from "../mainTopics/PIV/ConsolidatedOutputVAT";
import StampDutyDetailedReport from "../mainTopics/PIV/StampDutyDetailedReport";
import ProvincialConsolidatedOutputVAT from "../mainTopics/PIV/ProvincialConsolidatedOutputVAT";
import RegionWiseVatReport from "../mainTopics/PIV/RegionWiseVatReport";
import ProvinceSetOffReport from "../mainTopics/PIV/ProvinceSetOffReport";
import ProvinceManualSetOffReport from "../mainTopics/PIV/ProvinceManualSetOffReport";
import PosPaidPivTabulationSummaryAfmhq from "../mainTopics/PIV/PosPaidPivTabulationSummaryAfmhq";
import AccountCodesWisePivReport from "../mainTopics/PIV/AccountCodesWisePivReport";
import AccCodeWisePivNotAfmhqReport from "../mainTopics/PIV/AccCodeWisePivNotAfmhqReport";
import RefundedPivReport from "../mainTopics/PIV/RefundedPivReport";
import RegionPivFromOtherCC from "../mainTopics/PIV/RegionPivFromOtherCC";
import BankPivTabulation from "../mainTopics/PIV/BankPivTabulation";
import BankPaidPIVDetails from "../mainTopics/PIV/BankPaidPIVDetails";
import CostCenterwisePivDetails from "../mainTopics/PIV/CostCenterwisePivDetails";

// Analysis reports
import DebtorsAnalysis from "../mainTopics/Analysis/DebtorsAnalysis";
import AgeAnalysis from "../mainTopics/Analysis/AgeAnalysis";

// Billing & Payment reports
import CustomerDetails from "../mainTopics/billing&payment/CustomerDetails";

// Collections reports
import DishonouredCheques from "../mainTopics/Collections/DishonouredCheques";

// Consumption Analysis reports
import TariffBlockWiseConsumption from "../mainTopics/general/TariffBlockWiseConsumption";

// CashBook reports
import CashBookDetailsReport from "../mainTopics/CashBook/CashBookDetailsReport";
import CashBookCCReport from "../mainTopics/CashBook/CashBookCCReport";
import DocumentInquiry from "../mainTopics/CashBook/DocumentInquiry";

// General reports
import ActiveCustomersSalesByTariff from "../mainTopics/general/ActiveCustomersSalesByTariff";
import BillCalculation from "../mainTopics/general/BillCalculation";
import RegisteredConsumersForSMSAlerts from "../mainTopics/general/RegisteredConsumersForSMSAlerts";
import Securitydepositcontractdemandbulk from "../mainTopics/general/Securitydepositcontractdemandbulk";
import ListOfGovernmentAccounts from "../mainTopics/general/ListOfGovernmentAccounts";
import Arreasposition from "../mainTopics/general/Arreasposition";
import ListingofCustomers from "../mainTopics/general/ListingofCustomers";

// Income & Expenditure reports
import CostCenterIncomeExpenditure from "../mainTopics/IncomeExpenditure/CostCenterIncomeExpenditure";
import ProvinceExpenditure from "../mainTopics/IncomeExpenditure/ProvinceExpenditure";
import RegionExpenditure from "../mainTopics/IncomeExpenditure/RegionExpenditure";
import IncomeExpenditureRegionDetailed from "../mainTopics/IncomeExpenditure/IncomeExpenditureRegionDetailed";

// Inventory reports
import MaterialMaster from "../mainTopics/inventory/MaterialMaster";
import CostCenterQuantityHnad from "../mainTopics/inventory/CostCenterQuantityHnad";
import AverageConsumptions from "../mainTopics/inventory/AverageConsumptions";
import AverageConsumptionSelected from "../mainTopics/inventory/AverageConsumptionSelected";
import QtyOnHandAllRegion from "../mainTopics/inventory/QtyOnHandAllRegions";
import ProvincialQtyHand from "../mainTopics/inventory/provincialQtyHand";

// JobCard reports
import JobCardInfo from "../mainTopics/JobCards/JobCardInfo";
import JobCardMaterials from "../mainTopics/JobCards/JobCardMaterials";
import JobSearchOrdinary from "../mainTopics/JobCards/JobSearchOrdinary";

// Ledger Card reports
import LedgerCardReport from "../mainTopics/LedgerCard/LedgerCardReport";
import LCWithoutSubAcc from "../mainTopics/LedgerCard/LCWithoutSubAcc";
import LedgerCardSubAccountTotal from "../mainTopics/LedgerCard/LedgerCardSubAccountTotal";
import DivisionalLedgerCard from "../mainTopics/LedgerCard/DivisionalLedgerCard";

// Physical Verification reports
import PHVEntryForm from "../mainTopics/PhysicalVerification/PHVEntryForm";
import PHVValidation from "../mainTopics/PhysicalVerification/PHVValidation";
import PHVValidationWarehousewise from "../mainTopics/PhysicalVerification/PHVValidationWarehousewise";
import AnnualVerificationSheetSignature from "../mainTopics/PhysicalVerification/AnnualVerificationSheetSignature";
import AnnualVerificationWHwiseSignature from "../mainTopics/PhysicalVerification/AnnualVerificationWHwiseSignature";
import PHVSlowNonMovingWHwise from "../mainTopics/PhysicalVerification/PHVSlowNonMovingWHwise";
import PHVShortageSurplusWHwise from "../mainTopics/PhysicalVerification/PHVShortageSurplusWHwise";
import PHVObsoleteIdle from "../mainTopics/PhysicalVerification/PHVObsoleteIdle";
import PHVDamage from "../mainTopics/PhysicalVerification/PHVDamage";
import PHVNonMovingWHwiseBOS from "../mainTopics/PhysicalVerification/PHVNonMovingWHwiseBOS";
import PHVObsoleteIdleBOS from "../mainTopics/PhysicalVerification/PHVObsoleteIdleBOS";
import PHVDamageBOS from "../mainTopics/PhysicalVerification/PHVDamageBOS";
import LastDocNo from "../mainTopics/PhysicalVerification/LastDocNo";

// PUCSL/LISS reports
import PUCSLSolarConnection from "../mainTopics/PUCSL/PUCSLSolarConnection";

// Solar Information reports
import SolarPVBilling from "../mainTopics/SolarInformation/SolarPVBilling";
import SolarPVCapacityInformation from "../mainTopics/SolarInformation/SolarPVCapacityInformation";
import SolarProgressClarificationOrdinary from "../mainTopics/SolarInformation/SolarProgressClarificationOrdinary";
import SolarProgressClarificationBulk from "../mainTopics/SolarInformation/SolarProgressClarificationBulk";
import SolarPaymentRetail from "../mainTopics/SolarInformation/SolarPaymentRetail";
import SolarPaymentBulk from "../mainTopics/SolarInformation/SolarPaymentBulk";
import SolarConnectionDetailsRetail from "../mainTopics/SolarInformation/SolarConnectionDetailsRetail";
import SolarConnectionDetailsBulk from "../mainTopics/SolarInformation/SolarConnectionDetailsBulk";
import SolarCustomerInformation from "../mainTopics/SolarInformation/SolarCustomerInformation";

// Solar Jobs reports
import SolarBillingReport from "../mainTopics/SolarJobs/SolarBillingReport";
import SolarPendingJobsReport from "../mainTopics/SolarJobs/SolarPendingJobsReport";

// Solar Religious Purpose reports
import AreaWiseSRPApplicationPIV from "../mainTopics/SRP/AreaWiseSRPApplicationPIV";
import AreaWiseSRPApplicationPIVPaidReport from "../mainTopics/SRP/AreaWiseSRPApplicationPIVPaidReport";
import DivisionWiseSRPApplicationPIVPaidReport from "../mainTopics/SRP/DivisionWiseSRPApplicationPIVPaidReport";
import AreaWiseSRPEstimationPIVPaidReport from "../mainTopics/SRP/AreaWiseSRPEstimationPIVPaidReport";
import DivisionWiseSRPEstimationPIVPaidReport from "../mainTopics/SRP/DivisionWiseSRPEstimationPIVPaidReport";

// Trial Balance reports
import CostCenterTrial from "../mainTopics/TrialBalance/CostCenterTrial";
import ProvintionalWiseTrial from "../mainTopics/TrialBalance/ProvintionalWiseTrial";
import ReagionTrial from "../mainTopics/TrialBalance/ReagionTrial";

// Work In Progress reports
import AgeAnalysisCostCenter from "../mainTopics/WorkInProgress/AgeAnalysisCostCenter";
import CompletedCostCenterWise from "../mainTopics/WorkInProgress/CompletedCostCenterWise";

export type ReportComponentRegistry = Record<string, ComponentType>;

/**
 * Central registry mapping normalized report names to React components.
 * Add an entry for each report that should render a specific component.
 * The key should match the normalized (lowercase, punctuation-stripped) report name.
 */
export const reportComponentRegistry: ReportComponentRegistry = {
	// PIV reports
	"1 branch province wise piv collections paid to bank": ProvincePIV,
	"branch province wise piv collections paid to bank": ProvincePIV,
	"2 branch province wise piv collections by provincial pos relevant to the province": ProvincePIVProvincial,
	"branch province wise piv collections by provincial pos relevant to the province": ProvincePIVProvincial,
	"3 branch province wise piv collections paid to provincial pos": ProvincePIVAll,
	"branch province wise piv collections paid to provincial pos": ProvincePIVAll,
	"4 piv collections by provincial pos relevant to other cost centers": ProvincePivOtherCC,
	"piv collections by provincial pos relevant to other cost centers": ProvincePivOtherCC,
	"5 piv collections by other cost centers relevant to the province": OtherCCtoProvince,
	"piv collections by other cost centers relevant to the province": OtherCCtoProvince,
	"6 branch wise piv tabulation both bank and pos": BranchWisePivBoth,
	"branch wise piv tabulation both bank and pos": BranchWisePivBoth,
	"7 piv collections by banks": PivByBanks,
	"piv collections by banks": PivByBanks,
	"7 1 piv collections by peoples banks": PIVCollectionsByPeoplesBank,
	"piv collections by peoples banks": PIVCollectionsByPeoplesBank,
	"7 2 piv collections by ipg slt": PivBySLT,
	"piv collections by ipg slt": PivBySLT,
	"8 piv details report piv amount not tallied with paid amount": PIVDetailsReport,
	"piv details report piv amount not tallied with paid amount": PIVDetailsReport,
	"9 province wise piv stamp duty": ProvinceWisePIVStampDuty,
	"province wise piv stamp duty": ProvinceWisePIVStampDuty,
	"10 regional piv stamp duty": RegionalPIVStampDutyReport,
	"regional piv stamp duty": RegionalPIVStampDutyReport,
	"11 piv details for cheque deposits": PivChequeDepositReport,
	"piv details for cheque deposits": PivChequeDepositReport,
	"12 piv search": PivSearchReport,
	"piv search": PivSearchReport,
	"13 piv type wise piv details": TypewisePIV,
	"piv type wise piv details": TypewisePIV,
	"14 consolidated output vat schedule": ConsolidatedOutputVAT,
	"consolidated output vat schedule": ConsolidatedOutputVAT,
	"15 piv stamp duty detail report": StampDutyDetailedReport,
	"piv stamp duty detail report": StampDutyDetailedReport,
	"16 province wise vat report": ProvincialConsolidatedOutputVAT,
	"province wise vat report": ProvincialConsolidatedOutputVAT,
	"17 region wise vat report": RegionWiseVatReport,
	"region wise vat report": RegionWiseVatReport,
	"18 province wise system set off piv details": ProvinceSetOffReport,
	"province wise system set off piv details": ProvinceSetOffReport,
	"18 1 province wise manual set off piv details": ProvinceManualSetOffReport,
	"province wise manual set off piv details": ProvinceManualSetOffReport,
	"19 pos paid piv tabulation summary report afmhq": PosPaidPivTabulationSummaryAfmhq,
	"pos paid piv tabulation summary report afmhq": PosPaidPivTabulationSummaryAfmhq,
	"20 piv details issued and paid cost centers afmhq only": AccountCodesWisePivReport,
	"piv details issued and paid cost centers afmhq only": AccountCodesWisePivReport,
	"21 piv details paid cost center 913 00 and issued other company": AccCodeWisePivNotAfmhqReport,
	"piv details paid cost center 913 00 and issued other company": AccCodeWisePivNotAfmhqReport,
	"22 refunded piv details": RefundedPivReport,
	"refunded piv details": RefundedPivReport,
	"23 region wise piv collections by provincial pos relevant to other cost centers": RegionPivFromOtherCC,
	"region wise piv collections by provincial pos relevant to other cost centers": RegionPivFromOtherCC,
	"24 bank piv tabulation": BankPivTabulation,
	"bank piv tabulation": BankPivTabulation,
	"25 bank paid piv details": BankPaidPIVDetails,
	"bank paid piv details": BankPaidPIVDetails,
	"26 cost center wise piv details status report": CostCenterwisePivDetails,
	"cost center wise piv details status report": CostCenterwisePivDetails,

	// Analysis reports
	"total debtors analysis": DebtorsAnalysis,
	"debtors age analysis individual customers": AgeAnalysis,
	"age analysis bulk": AgeAnalysis,
	"consumption pattern analysis": AgeAnalysis,

	// Billing & Payment reports
	"customer information": CustomerDetails,
	"transaction history": CustomerDetails,
	"bill information": CustomerDetails,
	"payment inquires": CustomerDetails,
	"bill sms inquiry": CustomerDetails,
	"arrears position single customer": CustomerDetails,
	"suspense payment": CustomerDetails,

	// Collections reports
	"online counter collections": DishonouredCheques,
	"sales and collection": DishonouredCheques,
	"stamp duty for payment collections": DishonouredCheques,
	"monthly revenue collection of different channels": DishonouredCheques,
	"kiosk payment collection": DishonouredCheques,
	"payment collection": DishonouredCheques,
	"suspense payment details": DishonouredCheques,
	"finalized account details": DishonouredCheques,
	"written off account details": DishonouredCheques,
	"receivable position": DishonouredCheques,
	"unload loan information": DishonouredCheques,
	"dishonoured cheques": DishonouredCheques,

	// Consumption Analysis reports
	"tariff block wise consumption report": TariffBlockWiseConsumption,
	"tariff and block wise consumption analysis": TariffBlockWiseConsumption,
	"transformer wise consumption analysis": TariffBlockWiseConsumption,
	"business category wise consumption analysis": TariffBlockWiseConsumption,

	// CashBook reports
	"selected payee within date range": CashBookDetailsReport,
	"cost center wise selected payee within date range": CashBookCCReport,
	"cost center wise document inquiry cash book with cheque details": DocumentInquiry,

	// General reports
	"active customers and sales by tariff": ActiveCustomersSalesByTariff,
	"bill calculation": BillCalculation,
	"listing of customers": ListingofCustomers,
	"list of government accounts": ListOfGovernmentAccounts,
	"largest 100 customer details": ActiveCustomersSalesByTariff,
	"sequence change accounts": ActiveCustomersSalesByTariff,
	"retails journal": ActiveCustomersSalesByTariff,
	"arrears position meter reader wise": Arreasposition,
	"list of customers enlisted in master invoices": ActiveCustomersSalesByTariff,
	"disconnection list": ActiveCustomersSalesByTariff,
	"shakthi led distribution summary": ActiveCustomersSalesByTariff,
	"standing order report": ActiveCustomersSalesByTariff,
	"registered consumers for sms alerts": RegisteredConsumersForSMSAlerts,
	"finalized accounts": ActiveCustomersSalesByTariff,
	"outstanding dues": ActiveCustomersSalesByTariff,
	"largest consumption": ActiveCustomersSalesByTariff,
	"security deposit contract demand bulk": Securitydepositcontractdemandbulk,

	// Income & Expenditure reports
	"cost center wise income expenditure": CostCenterIncomeExpenditure,
	"province wise income expenditure": ProvinceExpenditure,
	"region wise income expenditure": RegionExpenditure,
	"region wise income expenditure detailed": IncomeExpenditureRegionDetailed,

	// Inventory reports
	"material details": MaterialMaster,
	"cost center wise quantity on hand": CostCenterQuantityHnad,
	"average consumptions all material codes": AverageConsumptions,
	"average consumptions selected maerial codes": AverageConsumptionSelected,
	"provincial quantity on hand cross tab": ProvincialQtyHand,
	"quantity on hand all region material active online": QtyOnHandAllRegion,

	// JobCard reports
	"job card details": JobCardInfo,
	"job card material details": JobCardMaterials,
	"job search ordinary": JobSearchOrdinary,
	"job search orinary": JobSearchOrdinary,

	// Ledger Card reports
	"ledger card with subaccounts": LedgerCardReport,
	"ledger card without subaccounts": LCWithoutSubAcc,
	"ledger card subaccounts total": LedgerCardSubAccountTotal,
	"sub accounts transactions for account code within selected company": DivisionalLedgerCard,

	// Physical Verification reports
	"1 phv entry form": PHVEntryForm,
	"phv entry form": PHVEntryForm,
	"2 1 phv validation": PHVValidation,
	"phv validation": PHVValidation,
	"2 2 phv validation warehousewise": PHVValidationWarehousewise,
	"phv validation warehousewise": PHVValidationWarehousewise,
	"3 1 annual verification sheet signature av 1 a": AnnualVerificationSheetSignature,
	"annual verification sheet signature av 1 a": AnnualVerificationSheetSignature,
	"3 2 annual verification sheet whwise signature av 1 a": AnnualVerificationWHwiseSignature,
	"annual verification sheet whwise signature av 1 a": AnnualVerificationWHwiseSignature,
	"4 physical verification non moving slow moving wh wise av 6": PHVSlowNonMovingWHwise,
	"physical verification non moving slow moving wh wise av 6": PHVSlowNonMovingWHwise,
	"5 physical verification shortage surplus wh wise av 1 b": PHVShortageSurplusWHwise,
	"physical verification shortage surplus wh wise av 1 b": PHVShortageSurplusWHwise,
	"6 1 physical verification obsolete idle grade code av 7a": PHVObsoleteIdle,
	"physical verification obsolete idle grade code av 7a": PHVObsoleteIdle,
	"6 2 physical verification damage av 7b": PHVDamage,
	"physical verification damage av 7b": PHVDamage,
	"7 physical verification non moving wh wise bos av 6 bos": PHVNonMovingWHwiseBOS,
	"physical verification non moving wh wise bos av 6 bos": PHVNonMovingWHwiseBOS,
	"8 physical verification obsolete idle bos av 7a bos": PHVObsoleteIdleBOS,
	"physical verification obsolete idle bos av 7a bos": PHVObsoleteIdleBOS,
	"9 physical verification damage bos av 7b bos": PHVDamageBOS,
	"physical verification damage bos av 7b bos": PHVDamageBOS,
	"10 last document no selected year": LastDocNo,
	"last document no selected year": LastDocNo,

	// PUCSL/LISS reports
	"liss submission retail journal adjustments": PUCSLSolarConnection,
	"pucsl reports liss data": PUCSLSolarConnection,
	"pucsl reports solar connections new": PUCSLSolarConnection,
	"solar data for unt calculation": PUCSLSolarConnection,

	// Solar Information reports
	"solar pv billing information": SolarPVBilling,
	"solar pv capacity information": SolarPVCapacityInformation,
	"solar progress clarification ordinary": SolarProgressClarificationOrdinary,
	"solar progress clarification bulk": SolarProgressClarificationBulk,
	"solar payment information retail": SolarPaymentRetail,
	"solar payment information bulk": SolarPaymentBulk,
	"solar connection details incl reading and usage retail": SolarConnectionDetailsRetail,
	"solar connection details incl reading and usage bulk": SolarConnectionDetailsBulk,
	"solar customer information": SolarCustomerInformation,

	// Solar Jobs reports
	"area wise solar sent to billing details": SolarBillingReport,
	"solar retail rooftop pending jobs after piv2 paid": SolarPendingJobsReport,

	// Solar Religious Purpose reports
	"area wise srp application piv pivi to be paid report": AreaWiseSRPApplicationPIV,
	"area wise srp application piv pivi paid report": AreaWiseSRPApplicationPIVPaidReport,
	"division wise srp application piv pivi to be paid report": DivisionWiseSRPApplicationPIVPaidReport,
	"area wise srp estimation piv pivii paid report": AreaWiseSRPEstimationPIVPaidReport,
	"division wise srp estimation piv pivii paid report": DivisionWiseSRPEstimationPIVPaidReport,

	// Trial Balance reports
	"cost center trial balance end of month year": CostCenterTrial,
	"cost center trial balance": CostCenterTrial,
	"provintial trial balance end of month year": ProvintionalWiseTrial,
	"provintial trial balance": ProvintionalWiseTrial,
	"provincial trial balance": ProvintionalWiseTrial,
	"region trial balance end of month year": ReagionTrial,
	"region trial balance": ReagionTrial,

	// Work In Progress reports
	"cost center wise work in progress with age analysis": AgeAnalysisCostCenter,
	"cost center wise work in progress completed projects": CompletedCostCenterWise,
};

/**
 * Get a report component by its normalized name.
 * If no component is registered, returns null.
 */
export const getReportComponent = (normalizedReportName: string): ComponentType | null => {
	return reportComponentRegistry[normalizedReportName] || null;
};

export const getReportComponentLoose = (normalizedReportName: string): ComponentType | null => {
	const query = normalizedReportName.trim();
	if (!query) {
		return null;
	}

	for (const [key, component] of Object.entries(reportComponentRegistry)) {
		if (key.includes(query) || query.includes(key)) {
			return component;
		}
	}

	return null;
};
