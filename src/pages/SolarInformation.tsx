import { useState, useEffect } from "react";
import { useRoleBasedSubtopics } from "../hooks/useRoleBasedSubtopics";
import SubtopicCard from "../components/shared/SubtopicCard";
import { useReportRenderer } from "../hooks/useReportRenderer";
import { normalizeReportName } from "../utils/reportNameMatch";

const SolarInformation = () => {
  const { subtopics, selectedSubtopicId } = useRoleBasedSubtopics([
    "Solar Information - Billing",
    "Solar Information – Billing",
    "Solar Information Billing",
  ]);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const renderReport = useReportRenderer();

  const menuSubtopics = [...subtopics];

  // Ensure "Solar Payment & LISS Reconciliation Report" is always available in the list
  const reconReportName = "Solar Payment & LISS Reconciliation Report";
  const reconIndex = menuSubtopics.findIndex(
    (subtopic) =>
      normalizeReportName(subtopic.name) === normalizeReportName(reconReportName)
  );

  const reconReport =
    reconIndex !== -1
      ? menuSubtopics.splice(reconIndex, 1)[0]
      : {
          id: Math.min(0, ...subtopics.map((subtopic) => subtopic.id), 0) - 20,
          name: reconReportName,
        };

  menuSubtopics.unshift(reconReport);



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

  return (
    <div className="flex flex-col gap-4 pt-5">
      {menuSubtopics.map((subtopic) => (
        <SubtopicCard
          key={subtopic.id}
          id={subtopic.id}
          title={subtopic.name}
          expanded={expandedCard === subtopic.id}
          onToggle={toggleCard}
        >
          {renderReport(subtopic.name, subtopic.repIdNo ?? String(subtopic.id))}
        </SubtopicCard>
      ))}
    </div>
  );
};
export default SolarInformation;






