import { useState, useEffect } from "react";
import { useRoleBasedSubtopics } from "../hooks/useRoleBasedSubtopics";
import SubtopicCard from "../components/shared/SubtopicCard";
import TariffBlockWiseConsumption from "../mainTopics/general/TariffBlockWiseConsumption";
import { matchesReportName } from "../utils/reportNameMatch";

const ConsumptionAnalysis = () => {
  const { subtopics, selectedSubtopicId } = useRoleBasedSubtopics(["Consumption Analysis"]);
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
      case matchesReportName(subtopicName, "Tariff Block Wise Consumption Report"):
        return <TariffBlockWiseConsumption />;
      case matchesReportName(subtopicName, "Tariff and Block wise Consumption Analysis"):
      case matchesReportName(subtopicName, "Transformer wise Consumption Analysis"):
      case matchesReportName(subtopicName, "Business Category wise Consumption Analysis"):
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

export default ConsumptionAnalysis;

