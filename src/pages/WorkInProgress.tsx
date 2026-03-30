import { useState, useEffect } from "react";
import { useRoleBasedSubtopics } from "../hooks/useRoleBasedSubtopics";
import SubtopicCard from "../components/shared/SubtopicCard";
import AgeAnalysisCostCenter from "../mainTopics/WorkInProgress/AgeAnalysisCostCenter";
import CompletedCostCenterWise from "../mainTopics/WorkInProgress/CompletedCostCenterWise";
import { matchesReportName } from "../utils/reportNameMatch";


const WorkInProgress = () => {
  const { subtopics, selectedSubtopicId } = useRoleBasedSubtopics(["Work In Progress"]);
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
			case matchesReportName(subtopicName, "Cost Center Wise Work In Progress With Age Analysis"):
				return <AgeAnalysisCostCenter />;
			case matchesReportName(subtopicName, "Cost Center Wise Work In Progress ( Completed Projects )"):
				return <CompletedCostCenterWise />;

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

export default WorkInProgress;

