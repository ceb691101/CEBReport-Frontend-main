import { useState, useEffect } from "react";
import { useRoleBasedSubtopics } from "../hooks/useRoleBasedSubtopics";
import { Outlet } from "react-router-dom";
import SubtopicCard from "../components/shared/SubtopicCard";

import AreaWiseSRPApplicationPIV from "../mainTopics/SRP/AreaWiseSRPApplicationPIV";
import AreaWiseSRPApplicationPIVStatus from "../mainTopics/SRP/AreaWiseSRPApplicationPIVStatus";
import AreaWiseSRPEstimationPIV from "../mainTopics/SRP/AreaWiseSRPEstimationPIV";
import AreaWiseSRPApplicationPIVPaidReport from "../mainTopics/SRP/AreaWiseSRPApplicationPIVPaidReport";
import DivisionWiseSRPApplicationPIVPaidReport from "../mainTopics/SRP/DivisionWiseSRPApplicationPIVPaidReport";
import AreaWiseSRPEstimationPIVPaidReport from "../mainTopics/SRP/AreaWiseSRPEstimationPIVPaidReport";

const SolarReligiousPurpose = () => {
  const { subtopics, selectedSubtopicId } = useRoleBasedSubtopics([
    "Solar Religious Purpose (SRP)",
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
    const normalized = subtopicName.toLowerCase().replace(/\s+/g, " ").trim();
    switch (normalized) {
      case "area wise srp application piv (pivi) to be paid report":
        return <AreaWiseSRPApplicationPIV />;
      case "area wise srp application piv status report":
        return <AreaWiseSRPApplicationPIVStatus />;
      case "area wise srp estimation piv (pivii) to be paid report":
        return <AreaWiseSRPEstimationPIV />;

      case "area wise srp application piv (pivi) paid report":
        return <AreaWiseSRPApplicationPIVPaidReport/>;

       case "division wise srp application piv (pivi) to be paid report":
        return <DivisionWiseSRPApplicationPIVPaidReport/>;

      case "area wise srp estimation piv (pivii) paid report":
        return <AreaWiseSRPEstimationPIVPaidReport/>;

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
      <Outlet />
    </div>
  );
};

export default SolarReligiousPurpose;




