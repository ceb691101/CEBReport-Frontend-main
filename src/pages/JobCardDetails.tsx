import {useState, useEffect} from "react";
import { useRoleBasedSubtopics } from "../hooks/useRoleBasedSubtopics";
import SubtopicCard from "../components/shared/SubtopicCard";
import JobCardInfo from "../mainTopics/JobCards/JobCardInfo";
import JobCardMaterials from "../mainTopics/JobCards/JobCardMaterials";
import JobSearchOrdinary from "../mainTopics/JobCards/JobSearchOrdinary";
import { matchesReportName } from "../utils/reportNameMatch";

const JobCardDetails = () => {
	const { subtopics, selectedSubtopicId } = useRoleBasedSubtopics(["Jobs"]);
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
			case matchesReportName(subtopicName, "Job Card Details"):
				return <JobCardInfo />;
			case matchesReportName(subtopicName, "Job Card -  Material Details"):
				return <JobCardMaterials />;

			case matchesReportName(subtopicName, "Job Search - Orinary"):
				return <JobSearchOrdinary />;

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

export default JobCardDetails;

