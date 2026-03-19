import {useState, useEffect} from "react";
import {data as sidebarData} from "../data/SideBarData";
import SubtopicCard from "../components/shared/SubtopicCard";
import JobCardInfo from "../mainTopics/JobCards/JobCardInfo";
import JobCardMaterials from "../mainTopics/JobCards/JobCardMaterials";
import JobSearchOrdinary from "../mainTopics/JobCards/JobSearchOrdinary";

type Subtopic = {
	id: number;
	name: string;
};

const JobCardDetails = () => {
	const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
	const [expandedCard, setExpandedCard] = useState<number | null>(null);

	useEffect(() => {
		const analysisTopic = sidebarData.find((topic) => topic.name === "Jobs");
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
			case "Job Card Details":
				return <JobCardInfo />;
			case "Job Card -  Material Details":
				return <JobCardMaterials />;

			case "Job Search - Orinary":
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
