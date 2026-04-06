import { useState, useEffect } from "react";
import { data as sidebarData } from "../data/SideBarData";
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
import RoofTopSolarInputData from "../mainTopics/SolarInformation/RoofTopSolarInputData";


type Subtopic = {
  id: number;
  name: string;
};

const SolarInformation = () => {
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  useEffect(() => {
    // Get Solar Information topic's subtopics directly from sidebarData
    const solarTopic = sidebarData.find(
      (topic) => topic.name === "Solar Information – Billing"
    );
    if (solarTopic) {
      setSubtopics(solarTopic.subtopics);
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
      case "Solar PV billing information":
        return <SolarPVBilling/>;
      case "Solar PV capacity information":
        return <SolarPVCapacityInformation/>;
      case "Solar progress clarification – Ordinary":
        return <SolarProgressClarificationOrdinary/>;
      case "Solar progress clarification – Bulk":
        return <SolarProgressClarificationBulk />;
      case "Solar payment information – retail":
        return <SolarPaymentRetail />;
      case "Solar payment information – Bulk":
        return <SolarPaymentBulk />;
      case "Solar connection details (incl. Reading and usage) - retail":
        return <SolarConnectionDetailsRetail />;
      case "Solar connection details (incl. Reading and usage) - bulk":
        return <SolarConnectionDetailsBulk />;
      case "Solar customer information":
        return <SolarCustomerInformation />;
      case "Rooftop Solar Input Data portal for T and D Loss Calculation":     
        return <RoofTopSolarInputData/>;
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