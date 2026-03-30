import { useState, useEffect } from "react";
import { useRoleBasedSubtopics } from "../hooks/useRoleBasedSubtopics";
import SubtopicCard from "../components/shared/SubtopicCard";

import SolarProgressClarificationBulk from "../mainTopics/SolarInformation/SolarProgressClarificationBulk";
import SolarProgressClarificationOrdinary from "../mainTopics/SolarInformation/SolarProgressClarificationOrdinary";
import SolarPVBilling from "../mainTopics/SolarInformation/SolarPVBilling";
import SolarPaymentRetail from "../mainTopics/SolarInformation/SolarPaymentRetail"
import SolarPVCapacityInformation from "../mainTopics/SolarInformation/SolarPVCapacityInformation";
import SolarPaymentBulk from "../mainTopics/SolarInformation/SolarPaymentBulk";
import SolarConnectionDetailsRetail from "../mainTopics/SolarInformation/SolarConnectionDetailsRetail";
import SolarConnectionDetailsBulk from "../mainTopics/SolarInformation/SolarConnectionDetailsBulk";
import SolarCustomerInformation from "../mainTopics/SolarInformation/SolarCustomerInformation";
import { matchesReportName } from "../utils/reportNameMatch";


const SolarInformation = () => {
  const { subtopics, selectedSubtopicId } = useRoleBasedSubtopics([
    "Solar Information - Billing",
    "Solar Information – Billing",
  ]);
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
      case matchesReportName(subtopicName, "Solar PV billing information"):
        return <SolarPVBilling/>;
      case matchesReportName(subtopicName, "Solar PV capacity information"):
        return <SolarPVCapacityInformation/>;
      case matchesReportName(subtopicName, "Solar progress clarification – Ordinary"):
        return <SolarProgressClarificationOrdinary/>;
      case matchesReportName(subtopicName, "Solar progress clarification – Bulk"):
        return <SolarProgressClarificationBulk />;
      case matchesReportName(subtopicName, "Solar payment information – retail"):
        return <SolarPaymentRetail />;
      case matchesReportName(subtopicName, "Solar payment information – Bulk"):
        return <SolarPaymentBulk />;
      case matchesReportName(subtopicName, "Solar connection details (incl. Reading and usage) - retail"):
        return <SolarConnectionDetailsRetail />;
      case matchesReportName(subtopicName, "Solar connection details (incl. Reading and usage) - bulk"):
        return <SolarConnectionDetailsBulk />;
      case matchesReportName(subtopicName, "Solar customer information"):
        return <SolarCustomerInformation />;
      case matchesReportName(subtopicName, "Rooftop Solar Input Data portal for T and D Loss Calculation"):     
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
export default SolarInformation;

