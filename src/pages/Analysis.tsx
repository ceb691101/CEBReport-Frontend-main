import { useState, useEffect, useMemo } from "react";
import { useRoleBasedSubtopics } from "../hooks/useRoleBasedSubtopics";
import SubtopicCard from "../components/shared/SubtopicCard";
import { useReportRenderer } from "../hooks/useReportRenderer";



const Analysis = () => {
  const { subtopics, selectedSubtopicId } = useRoleBasedSubtopics(["Analysis"]);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const renderReport = useReportRenderer();

  const analysisSubtopics = useMemo(() => {
    const solarAgeAnalysisSubtopic = {
      id: 9991,
      name: "Age Analysis of Solar Power Consumers",
      repIdNo: "9991",
    };

    const hasSolarAgeAnalysis = subtopics.some(
      (subtopic) => subtopic.name === solarAgeAnalysisSubtopic.name
    );

    return hasSolarAgeAnalysis
      ? subtopics
      : [...subtopics, solarAgeAnalysisSubtopic];
  }, [subtopics]);

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
      {analysisSubtopics.map((subtopic) => (
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

export default Analysis;


