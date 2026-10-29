import { useState, useEffect } from "react";
import { useRoleBasedSubtopics } from "../hooks/useRoleBasedSubtopics";
import type { RoleSubtopic } from "../hooks/useRoleBasedSubtopics";
import SubtopicCard from "../components/shared/SubtopicCard";
import { useReportRenderer } from "../hooks/useReportRenderer";
import { normalizeReportName } from "../utils/reportNameMatch";

const PucslLiss = () => {
  const { subtopics, selectedSubtopicId } = useRoleBasedSubtopics(["PUCSL/LISS"]);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const renderReport = useReportRenderer();
  const retailJournals: RoleSubtopic = {
    id: Math.min(0, ...subtopics.map((subtopic) => subtopic.id)) - 1,
    name: "Solar Journals - Retail",
  };
  const hasRetailJournals = subtopics.some(
    (subtopic) => normalizeReportName(subtopic.name) === normalizeReportName(retailJournals.name)
  );
  const visibleSubtopics = subtopics.length > 0 && !hasRetailJournals
    ? [...subtopics, retailJournals]
    : subtopics;

  const menuSubtopics = [...visibleSubtopics];

  // Ensure "Solar Journals - Bulk" is always available in PUCSL/LISS list
  const journalsReportName = "Solar Journals - Bulk";
  const journalsIndex = menuSubtopics.findIndex(
    (subtopic) =>
      normalizeReportName(subtopic.name) === normalizeReportName(journalsReportName)
  );

  const journalsReport =
    journalsIndex !== -1
      ? menuSubtopics.splice(journalsIndex, 1)[0]
      : {
          id: Math.min(0, ...menuSubtopics.map((subtopic) => subtopic.id)) - 99,
          name: journalsReportName,
        };

  menuSubtopics.push(journalsReport);

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

export default PucslLiss;





