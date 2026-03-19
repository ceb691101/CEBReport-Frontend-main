import { useState, useEffect } from "react";
import ActiveCustomersSalesByTariff from "../mainTopics/general/ActiveCustomersSalesByTariff";
import { data as sidebarData } from "../data/SideBarData";
import SubtopicCard from "../components/shared/SubtopicCard";
import BillCalculation from "../mainTopics/general/BillCalculation";


type Subtopic = {
  id: number;
  name: string;
};

const General = () => {
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  useEffect(() => {
    // Get General topic's subtopics directly from sidebarData
    const generalTopic = sidebarData.find((topic) => topic.name === "General");
    if (generalTopic) {
      setSubtopics(generalTopic.subtopics);
    }
  }, []);

  const toggleCard = (id: number) => {
    if (expandedCard === id) {
      setExpandedCard(null);
    } else {
      setExpandedCard(id);
    }
  };

  const renderSubtopicContent = (subtopicName: string) => {
    switch (subtopicName) {
      case "Active customers and sales by tariff":
        return <ActiveCustomersSalesByTariff />;
      case "Bill calculation":
        return <BillCalculation />;
      case "Listing of customers":
      case "List of government accounts":
      case "Largest 100 customer details":
      case "Sequence change accounts":
      case "Retails Journal":
      case "Arrears position – meter reader wise":
      case "List of customers (enlisted in Master Invoices)":
      case "Disconnection list":
      case "Shakthi LED distribution summary":
      case "Standing order report":
      case "Registered consumers for SMS alerts":
      case "Finalized Accounts":
      case "Outstanding Dues":
      case "Largest Consumption": 
      case "Security deposit & Contract Demand - Bulk":  
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
