import { useState, useEffect } from "react";
import ActiveCustomersSalesByTariff from "../mainTopics/general/ActiveCustomersSalesByTariff";
import { useRoleBasedSubtopics } from "../hooks/useRoleBasedSubtopics";
import SubtopicCard from "../components/shared/SubtopicCard";
import { matchesReportName } from "../utils/reportNameMatch";


const General = () => {
  const { subtopics, selectedSubtopicId } = useRoleBasedSubtopics(["General"]);
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
      case matchesReportName(subtopicName, "Active customers and sales by tariff"):
        return <ActiveCustomersSalesByTariff />;
      case matchesReportName(subtopicName, "Bill calculation"):
      case matchesReportName(subtopicName, "Listing of customers"):
      case matchesReportName(subtopicName, "List of government accounts"):
      case matchesReportName(subtopicName, "Largest 100 customer details"):
      case matchesReportName(subtopicName, "Sequence change accounts"):
      case matchesReportName(subtopicName, "Retails Journal"):
      case matchesReportName(subtopicName, "Arrears position – meter reader wise"):
      case matchesReportName(subtopicName, "List of customers (enlisted in Master Invoices)"):
      case matchesReportName(subtopicName, "Disconnection list"):
      case matchesReportName(subtopicName, "Shakthi LED distribution summary"):
      case matchesReportName(subtopicName, "Standing order report"):
      case matchesReportName(subtopicName, "Registered consumers for SMS alerts"):
      case matchesReportName(subtopicName, "Finalized Accounts"):
      case matchesReportName(subtopicName, "Outstanding Dues"):
      case matchesReportName(subtopicName, "Largest Consumption"): 
      case matchesReportName(subtopicName, "Security deposit & Contract Demand - Bulk"):  
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

export default General;

