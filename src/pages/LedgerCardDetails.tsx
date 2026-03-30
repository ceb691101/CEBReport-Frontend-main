import {useState, useEffect} from "react";
import { useRoleBasedSubtopics } from "../hooks/useRoleBasedSubtopics";
import SubtopicCard from "../components/shared/SubtopicCard";
import LedgerCardReport from "../mainTopics/LedgerCard/LedgerCardReport";
import LCWithoutSubAcc from "../mainTopics/LedgerCard/LCWithoutSubAcc";
import LedgerCardSubAccountTotal from "../mainTopics/LedgerCard/LedgerCardSubAccountTotal";
import DivisionalLedgerCard from "../mainTopics/LedgerCard/DivisionalLedgerCard";
import { matchesReportName } from "../utils/reportNameMatch";

const LedgerCardDetails = () => {
	const { subtopics, selectedSubtopicId } = useRoleBasedSubtopics(["Ledger Cards"]);
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

	const renderSubtopicContent = (subtopicName: string) => {
		switch (true) {
			case matchesReportName(subtopicName, "Ledger Card with Subaccounts"):
				return <LedgerCardReport />;
			case matchesReportName(subtopicName, "Ledger Card without Subaccounts"):
				return <LCWithoutSubAcc />;
			case matchesReportName(subtopicName, "Ledger Card  Subaccounts Total"):
				return <LedgerCardSubAccountTotal />;
			case matchesReportName(subtopicName, "Sub Accounts Transactions for Account Code within Selected Company"):
				return <DivisionalLedgerCard />;

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

export default LedgerCardDetails;

