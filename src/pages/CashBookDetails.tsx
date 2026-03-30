import {useState, useEffect} from "react";
import { useRoleBasedSubtopics } from "../hooks/useRoleBasedSubtopics";
import SubtopicCard from "../components/shared/SubtopicCard";
import CashBookDetailsReport from "../mainTopics/CashBook/CashBookDetailsReport";
import CashBookCCReport from "../mainTopics/CashBook/CashBookCCReport";
import DocumentInquiry from "../mainTopics/CashBook/DocumentInquiry";
import { matchesReportName } from "../utils/reportNameMatch";

const CashBookDetails = () => {
	const { subtopics, selectedSubtopicId } = useRoleBasedSubtopics(["Cash Book"]);
	const [expandedCard, setExpandedCard] = useState<number | null>(null);

	useEffect(() => {
		if (typeof selectedSubtopicId === "number") {
			setExpandedCard(selectedSubtopicId);
		}
	}, [selectedSubtopicId]);

	const toggleCard = (id: number) => {
		setExpandedCard((prev) => (prev === id ? null : id));
	};

	const renderSubtopicContent = (subtopicName: string) => {
		switch (true) {
			case matchesReportName(subtopicName, "Selected Payee Within Date Range"):
				return <CashBookDetailsReport />;
			case matchesReportName(subtopicName, "Cost Center Wise Selected Payee Within Date Range"):
				return <CashBookCCReport />;
			case matchesReportName(subtopicName, "Cost Center Wise Document Inquiry Cash Book With Cheque Details"):
				return <DocumentInquiry />;
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

export default CashBookDetails;

