import { useState, useEffect } from "react";
import { useRoleBasedSubtopics } from "../hooks/useRoleBasedSubtopics";
import SubtopicCard from "../components/shared/SubtopicCard";
import { useReportRenderer } from "../hooks/useReportRenderer";

const governmentAgeAnalysisName = "Age Analysis For Government Customers(Bulk Customers)";
const displaySubtopicName = (name: string) =>
  name.trim().toLowerCase() === "age analysis for government customers"
    ? governmentAgeAnalysisName
    : name;



const Analysis = () => {
  const { subtopics, selectedSubtopicId } = useRoleBasedSubtopics(["Analysis"]);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const renderReport = useReportRenderer();


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
      {subtopics.map((subtopic) => (
        <SubtopicCard
          key={subtopic.id}
          id={subtopic.id}
          title={displaySubtopicName(subtopic.name)}
          expanded={expandedCard === subtopic.id}
          onToggle={toggleCard}
        >
            {renderReport(displaySubtopicName(subtopic.name), subtopic.repIdNo ?? String(subtopic.id))}
        </SubtopicCard>
      ))}
    </div>
  );
};

export default Analysis;

