import {useState, useEffect} from "react";
import { useRoleBasedSubtopics } from "../hooks/useRoleBasedSubtopics";
import SubtopicCard from "../components/shared/SubtopicCard";
import CostCenterIncomeExpenditure from "../mainTopics/IncomeExpenditure/CostCenterIncomeExpenditure";
import ProvinceExpenditure from "../mainTopics/IncomeExpenditure/ProvinceExpenditure";
import RegionExpenditure from "../mainTopics/IncomeExpenditure/RegionExpenditure";
import IncomeExpenditureRegionDetailed from "../mainTopics/IncomeExpenditure/IncomeExpenditureRegionDetailed";
import { matchesReportName } from "../utils/reportNameMatch";

const IncomeExpenditure = () => {
	const { subtopics, selectedSubtopicId } = useRoleBasedSubtopics(["Income & Expenditure"]);
	const [expandedCard, setExpandedCard] = useState<number | null>(null);

	useEffect(() => {
		if (typeof selectedSubtopicId === "number") {
			setExpandedCard(selectedSubtopicId);
		}
	}, [selectedSubtopicId]);

	const toggleCard = (id: number) => {
		setExpandedCard(expandedCard === id ? null : id);
	};

	const renderSubtopicContent = (subtopicName: string) => {
		switch (true) {
			case matchesReportName(subtopicName, "Cost Center Wise Income & Expenditure"):
				return <CostCenterIncomeExpenditure />;
			case matchesReportName(subtopicName, "Province Wise Income & Expenditure"):
				return <ProvinceExpenditure />;
			case matchesReportName(subtopicName, "Region Wise Income & Expenditure"):
				return <RegionExpenditure />;
			case matchesReportName(subtopicName, "Region Wise Income & Expenditure (Detailed)"):
				return <IncomeExpenditureRegionDetailed />;
			default:
				return (
					<div className="text-red-500 text-xs">
						No content available for {subtopicName}
					</div>
				);
		}
	};

	return (
		<div className="flex flex-col gap-4 pt-5">
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

export default IncomeExpenditure;

