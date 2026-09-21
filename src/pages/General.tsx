import { useState, useEffect } from "react";
import { useRoleBasedSubtopics } from "../hooks/useRoleBasedSubtopics";
import SubtopicCard from "../components/shared/SubtopicCard";
import { useReportRenderer } from "../hooks/useReportRenderer";
import { normalizeReportName } from "../utils/reportNameMatch";

const General = () => {
  const { subtopics, selectedSubtopicId } = useRoleBasedSubtopics(["General"]);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const renderReport = useReportRenderer();
  const menuSubtopics = [...subtopics];
  const billIndex = menuSubtopics.findIndex(
    (subtopic) => normalizeReportName(subtopic.name) === "bill calculation"
  );

  if (billIndex !== -1) {
    const tariffIndex = menuSubtopics.findIndex(
      (subtopic) => normalizeReportName(subtopic.name) === "tariff structure"
    );
    // Keep an API-provided item and its ID when one is available.
    const tariff = tariffIndex !== -1
      ? menuSubtopics.splice(tariffIndex, 1)[0]
      : {
          id: Math.min(0, ...subtopics.map((subtopic) => subtopic.id)) - 1,
          name: "Tariff Structure",
        };
    const insertIndex = menuSubtopics.findIndex(
      (subtopic) => normalizeReportName(subtopic.name) === "bill calculation"
    );
    menuSubtopics.splice(insertIndex + 1, 0, tariff);
  }

  useEffect(() => {
    if (typeof selectedSubtopicId === "number") {
      setExpandedCard(selectedSubtopicId);
    }
  }, [selectedSubtopicId]);

  const toggleCard = (id: number) => {
    setExpandedCard((prev) => (prev === id ? null : id));
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

export default General;
