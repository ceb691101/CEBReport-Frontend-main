import {useState, useEffect} from "react";
import { useRoleBasedSubtopics } from "../hooks/useRoleBasedSubtopics";
import SubtopicCard from "../components/shared/SubtopicCard";
import ProvincePIV from "../mainTopics/PIV/ProvincePIV";
import ProvincePIVProvincial from "../mainTopics/PIV/ProvincePIVProvincial";
import ProvincePIVAll from "../mainTopics/PIV/ProvincePIVAll";
import ProvincePivOtherCC from "../mainTopics/PIV/ProvincePivOtherCC";
import OtherCCtoProvince from "../mainTopics/PIV/OtherCCtoProvince";
import BranchWisePivBoth from "../mainTopics/PIV/BranchWisePivBoth";
import PIVCollectionsByPeoplesBank from "../mainTopics/PIV/PIVCollectionsByPeoplesBank";
import PivBySLT from "../mainTopics/PIV/PIVCollectionsBySLT";
import PivByBanks from "../mainTopics/PIV/PivByBanks";
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
import BankPaidPIVDetails from "../mainTopics/PIV/BankPaidPIVDetails";
import BankPivTabulation from "../mainTopics/PIV/BankPivTabulation";
import CostCenterwisePivDetails from "../mainTopics/PIV/CostCenterwisePivDetails";

const PIVDetails = () => {
	const { subtopics, selectedSubtopicId } = useRoleBasedSubtopics(["PIV", "PIV Details"]);
	const [expandedCard, setExpandedCard] = useState<number | null>(null);

	useEffect(() => {
		if (typeof selectedSubtopicId === "number") {
			setExpandedCard(selectedSubtopicId);
		}
	}, [selectedSubtopicId]);

	const toggleCard = (id: number) => {
		if (expandedCard === id) {
			setExpandedCard(null);
		} else {
			setExpandedCard(id);
		}
	};

	const normalizeReportName = (value: string) =>
		value
			.toLowerCase()
			.replace(/[\u2013\u2014]/g, "-")
			.replace(/[^a-z0-9]+/g, " ")
			.trim();

	const renderSubtopicContent = (subtopicName: string) => {
		const key = normalizeReportName(subtopicName);

		switch (key) {
			case "1 branch province wise piv collections paid to bank":
			case "branch province wise piv collections paid to bank":
				return <ProvincePIV />;
			case "2 branch province wise piv collections by provincial pos relevant to the province":
			case "branch province wise piv collections by provincial pos relevant to the province":
				return <ProvincePIVProvincial />;
			case "3 branch province wise piv collections paid to provincial pos":
			case "branch province wise piv collections paid to provincial pos":
				return <ProvincePIVAll />;
			case "4 piv collections by provincial pos relevant to other cost centers":
			case "piv collections by provincial pos relevant to other cost centers":
				return <ProvincePivOtherCC />;
			case "5 piv collections by other cost centers relevant to the province":
			case "piv collections by other cost centers relevant to the province":
				return <OtherCCtoProvince />;
			case "6 branch wise piv tabulation both bank and pos":
			case "branch wise piv tabulation both bank and pos":
				return <BranchWisePivBoth />;
			case "7 piv collections by banks":
			case "piv collections by banks":
				return <PivByBanks />;
			case "7 1 piv collections by peoples banks":
			case "piv collections by peoples banks":
				return <PIVCollectionsByPeoplesBank />;
			case "7 2 piv collections by ipg slt":
			case "piv collections by ipg slt":
				return <PivBySLT />;
			case "8 piv details report piv amount not tallied with paid amount":
			case "piv details report piv amount not tallied with paid amount":
				return <PIVDetailsReport />;
			case "9 province wise piv stamp duty":
			case "province wise piv stamp duty":
				return <ProvinceWisePIVStampDuty />;
			case "10 regional piv stamp duty":
			case "regional piv stamp duty":
				return <RegionalPIVStampDutyReport />;
			case "11 piv details for cheque deposits":
			case "piv details for cheque deposits":
				return <PivChequeDepositReport />;
			case "12 piv search":
			case "piv search":
				return <PivSearchReport />;
			case "13 piv type wise piv details":
			case "piv type wise piv details":
				return <TypewisePIV />;
			case "14 consolidated output vat schedule":
			case "consolidated output vat schedule":
				return <ConsolidatedOutputVAT />;
			case "15 piv stamp duty detail report":
			case "piv stamp duty detail report":
				return <StampDutyDetailedReport />;
			case "16 province wise vat report":
			case "province wise vat report":
				return <ProvincialConsolidatedOutputVAT />;
			case "17 region wise vat report":
			case "region wise vat report":
				return <RegionWiseVatReport />;
			case "18 province wise system set off piv details":
			case "province wise system set off piv details":
				return <ProvinceSetOffReport />;
			case "18 1 province wise manual set off piv details":
			case "province wise manual set off piv details":
				return <ProvinceManualSetOffReport />;
			case "19 pos paid piv tabulation summary report afmhq":
			case "pos paid piv tabulation summary report afmhq":
				return <PosPaidPivTabulationSummaryAfmhq />;
			case "20 piv details issued and paid cost centers afmhq only":
			case "piv details issued and paid cost centers afmhq only":
				return <AccountCodesWisePivReport />;
			case "21 piv details paid cost center 913 00 and issued other company":
			case "piv details paid cost center 913 00 and issued other company":
				return <AccCodeWisePivNotAfmhqReport />;
			case "22 refunded piv details":
			case "refunded piv details":
				return <RefundedPivReport />;
			case "23 region wise piv collections by provincial pos relevant to other cost centers":
			case "region wise piv collections by provincial pos relevant to other cost centers":
				return <RegionPivFromOtherCC />;
			case "24 bank piv tabulation":
			case "bank piv tabulation":
				return <BankPivTabulation />;

			case "25 bank paid piv details":
			case "bank paid piv details":
				return <BankPaidPIVDetails />;

			case "26 cost center wise piv details status report":
			case "cost center wise piv details status report":
				return <CostCenterwisePivDetails />;

			default:
				return (
					<div className="text-red-500 text-xs">
						No content available for {subtopicName}
					</div>
				);
		}
	};

	return (
		<div className="flex flex-col gap-4 pt-4 px-10">
			{subtopics.map((subtopic) => (
				<SubtopicCard
					key={subtopic.id}
					id={subtopic.id}
					title={subtopic.name}
					expanded={expandedCard === subtopic.id}
					onToggle={toggleCard}
				>
					{renderSubtopicContent(subtopic.name)}
				</SubtopicCard>
			))}
		</div>
	);
};

export default PIVDetails;
