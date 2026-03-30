import { useState, useEffect } from "react";
import { useRoleBasedSubtopics } from "../hooks/useRoleBasedSubtopics";
import { Outlet } from "react-router-dom";
import SubtopicCard from "../components/shared/SubtopicCard";
import { matchesReportName } from "../utils/reportNameMatch";

const TransmissionBilling = () => {
  const { subtopics, selectedSubtopicId } = useRoleBasedSubtopics(["Transmission Billing"]);
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
      case matchesReportName(subtopicName, "Monthly Energy Sales (Assessed units taken from consolidated data)"): 
      case matchesReportName(subtopicName, "Monthly Energy Sales (Assessed units taken from provincial data)"):     
        return <div>{subtopicName} Content</div>;
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
      <Outlet />
    </div>
  );
};

export default TransmissionBilling;

