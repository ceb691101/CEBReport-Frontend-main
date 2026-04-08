import {useState, useEffect} from "react";
import {data as sidebarData} from "../data/SideBarData";
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

type Subtopic = {
	id: number;
	name: string;
};

const PIVDetails = () => {
	const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
	const [expandedCard, setExpandedCard] = useState<number | null>(null);

	useEffect(() => {
		const analysisTopic = sidebarData.find((topic) => topic.name === "PIV");
		if (analysisTopic) {
			setSubtopics(analysisTopic.subtopics);
		}
	}, []);

	const toggleCard = (id: number) => {
		if (expandedCard === id) {
			setExpandedCard(null);
		} else {
			setExpandedCard(id);
		}
	};

	const renderSubtopicContent = (subtopicName: string) => {
		switch (subtopicName) {
			case "1. Branch/Province wise PIV Collections Paid to Bank":
				return <ProvincePIV />;
			case "2. Branch/Province wise PIV Collections by Provincial POS relevant to the Province":
				return <ProvincePIVProvincial />;
			case "3. Branch/Province wise PIV Collections Paid to Provincial POS":
				return <ProvincePIVAll />;
			case "4. PIV Collections by Provincial POS relevant to Other Cost Centers":
				return <ProvincePivOtherCC />;
			case "5. PIV Collections by Other Cost Centers relevant to the Province":
				return <OtherCCtoProvince />;
			case "6. Branch wise PIV Tabulation ( Both Bank and POS)":
				return <BranchWisePivBoth />;
			case "7. PIV Collections by Banks":
				return <PivByBanks />;
			case "7.1 PIV Collections by Peoples Banks":
				return <PIVCollectionsByPeoplesBank />;
			case "7.2 PIV Collections by IPG  (SLT) ":
				return <PivBySLT />;
			case "8. PIV Details Report (PIV Amount not tallied with Paid Amount)":
				return <PIVDetailsReport />;
			case "9. Province wise PIV Stamp Duty":
				return <ProvinceWisePIVStampDuty />;
			case "10. Regional PIV Stamp Duty":
				return <RegionalPIVStampDutyReport />;
			case "11. PIV Details for Cheque Deposits":
				return <PivChequeDepositReport />;
			case "12. PIV Search":
				return <PivSearchReport />;
			case "13. PIV Type wise PIV Details":
				return <TypewisePIV />;
			case "14. Consolidated Output VAT Schedule":
				return <ConsolidatedOutputVAT />;
			case "15. PIV Stamp Duty Detail Report":
				return <StampDutyDetailedReport />;
			case "16. Province wise VAT Report":
				return <ProvincialConsolidatedOutputVAT />;
			case "17. Region wise VAT Report":
				return <RegionWiseVatReport />;
			case "18. Province wise System Set-Off PIV Details":
				return <ProvinceSetOffReport />;
			case "18.1 Province wise Manual Set-Off PIV Details":
				return <ProvinceManualSetOffReport />;
			case "19. POS Paid PIV Tabulation Summary Report (AFMHQ)":
				return <PosPaidPivTabulationSummaryAfmhq />;
			case "20. PIV Details (Issued and Paid Cost Centers AFMHQ Only)":
				return <AccountCodesWisePivReport />;
			case "21. PIV Details (Paid Cost center: 913.00 and Issued Other Company)":
				return <AccCodeWisePivNotAfmhqReport />;
			case "22. Refunded PIV Details":
				return <RefundedPivReport />;
			case "23. Region wise PIV Collections by Provincial POS relevant to Other Cost Centers":
				return <RegionPivFromOtherCC />;
			case "24. Bank PIV Tabulation":
				return <BankPivTabulation />;

			case "25. Bank Paid Piv Details":
				return <BankPaidPIVDetails />;

			case "26. Cost Center wise PIV Details (Status Report)":
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
