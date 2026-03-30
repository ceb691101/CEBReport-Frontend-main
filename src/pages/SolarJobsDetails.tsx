import {useState, useEffect} from "react";
import { useRoleBasedSubtopics } from "../hooks/useRoleBasedSubtopics";
import SubtopicCard from "../components/shared/SubtopicCard";
import SolarBillingReport from "../mainTopics/SolarJobs/SolarBillingReport";
import SolarPendingJobsReport from "../mainTopics/SolarJobs/SolarPendingJobsReport";
import { matchesReportName } from "../utils/reportNameMatch";


const SolarJobsDetails = () => {
	const { subtopics, selectedSubtopicId } = useRoleBasedSubtopics(["Solar Information - Jobs"]);
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
			case matchesReportName(subtopicName, "Area-wise Solar Sent to Billing Details"):
				return <SolarBillingReport />;
			case matchesReportName(subtopicName, "Solar Retail Rooftop Pending Jobs after PIV2 Paid"):
				return <SolarPendingJobsReport />;

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

export default SolarJobsDetails;

