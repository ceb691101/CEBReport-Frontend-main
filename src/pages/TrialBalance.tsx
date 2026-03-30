import { useState, useEffect } from "react";
import { useRoleBasedSubtopics } from "../hooks/useRoleBasedSubtopics";
import SubtopicCard from "../components/shared/SubtopicCard";
import CostCenterTrial from "../mainTopics/TrialBalance/CostCenterTrial";
import ProvintionalWiseTrial from "../mainTopics/TrialBalance/ProvintionalWiseTrial";
import ReagionTrial from "../mainTopics/TrialBalance/ReagionTrial";
import { matchesReportName } from "../utils/reportNameMatch";

const TrialBalance = () => {
  const { subtopics, selectedSubtopicId } = useRoleBasedSubtopics(["Trial Balance"]);
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
      case matchesReportName(subtopicName, "Cost Center Trial Balance - End of Month/Year"):
        return <CostCenterTrial/>;

         case matchesReportName(subtopicName, "Provintial Trial Balance - End of Month/Year"):
        return <ProvintionalWiseTrial/>;
         case matchesReportName(subtopicName, "Region Trial Balance - End of Month/Year"):
        return <ReagionTrial/>;

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

export default TrialBalance;

