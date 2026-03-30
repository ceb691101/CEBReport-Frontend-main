import { useState, useEffect } from "react";
import { useRoleBasedSubtopics } from "../hooks/useRoleBasedSubtopics";
import SubtopicCard from "../components/shared/SubtopicCard";
import PUCSLSolarConnection from "../mainTopics/PUCSL/PUCSLSolarConnection";
import { matchesReportName } from "../utils/reportNameMatch";

const PucslLiss = () => {
  const { subtopics, selectedSubtopicId } = useRoleBasedSubtopics(["PUCSL/LISS"]);
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
      case matchesReportName(subtopicName, "LISS submission – retail journal adjustments"):
      case matchesReportName(subtopicName, "PUCSL Reports (LISS Data)"):
      case matchesReportName(subtopicName, "PUCSL Reports – solar connections (New)"):
        return <PUCSLSolarConnection />;
      case matchesReportName(subtopicName, "Solar data for UNT calculation"):
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
    </div>
  );
};

export default PucslLiss;

