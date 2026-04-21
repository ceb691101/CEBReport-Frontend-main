import { useState, useEffect } from "react";
import ActiveCustomersSalesByTariff from "../mainTopics/general/ActiveCustomersSalesByTariff";
import SecurityDepositContractDemandBulk from "../mainTopics/general/Securitydepositcontractdemandbulk";
import RegisteredConsumersForSMSAlerts from "../mainTopics/general/RegisteredConsumersForSMSAlerts";
import ListOfGovernmentAccounts from "../mainTopics/general/ListOfGovernmentAccounts";
import AreasPosition from "../mainTopics/general/Arreasposition";
import { data as sidebarData } from "../data/SideBarData";
import SubtopicCard from "../components/shared/SubtopicCard";

type Subtopic = {
  id: number;
  name: string;
};

const General = () => {
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  useEffect(() => {
    const generalTopic = sidebarData.find((topic) => topic.name === "General");
    if (generalTopic) {
      setSubtopics(generalTopic.subtopics);
    }
  }, []);

  const toggleCard = (id: number) => {
    setExpandedCard((prev) => (prev === id ? null : id));
  };

  const renderSubtopicContent = (subtopicName: string) => {
    switch (subtopicName) {
      case "Active customers and sales by tariff":
        return <ActiveCustomersSalesByTariff />;
      case "Security deposit & Contract Demand - Bulk":
        return <SecurityDepositContractDemandBulk />;
      case "Registered consumers for SMS alerts":
        return <RegisteredConsumersForSMSAlerts />;
      case "List of government accounts":
        return <ListOfGovernmentAccounts />;
      case "Arrears position \u2013 meter reader wise":
        return <AreasPosition />;
      case "Bill calculation":
      case "Listing of customers":
      case "Largest 100 customer details":
      case "Sequence change accounts":
      case "Retails Journal":
      case "List of customers (enlisted in Master Invoices)":
      case "Disconnection list":
      case "Shakthi LED distribution summary":
      case "Standing order report":
      case "Finalized Accounts":
      case "Outstanding Dues":
      case "Largest Consumption":
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