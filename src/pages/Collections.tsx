import { useState, useEffect } from "react";
import { useRoleBasedSubtopics } from "../hooks/useRoleBasedSubtopics";
import SubtopicCard from "../components/shared/SubtopicCard";
import DishonouredCheques from "../mainTopics/Collections/DishonouredCheques";
import { matchesReportName } from "../utils/reportNameMatch";

const Collections = () => {
  const { subtopics, selectedSubtopicId } = useRoleBasedSubtopics(["Collections"]);
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
      case matchesReportName(subtopicName, "Online counter collections"):
      case matchesReportName(subtopicName, "Sales and collection"):
      case matchesReportName(subtopicName, "Stamp duty for payment collections"):
      case matchesReportName(subtopicName, "Monthly revenue collection of different channels"):
      case matchesReportName(subtopicName, "Kiosk payment collection"):
      case matchesReportName(subtopicName, "Payment collection"):
      case matchesReportName(subtopicName, "Suspense payment details"):
      case matchesReportName(subtopicName, "Finalized account details"):
      case matchesReportName(subtopicName, "Written off account details"):
      case matchesReportName(subtopicName, "Receivable position"):
      case matchesReportName(subtopicName, "Unload loan information"):

      
        
        return <div>{subtopicName} Content</div>;
case matchesReportName(subtopicName, "Dishonoured cheques"):
  return <DishonouredCheques />;




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

export default Collections;

