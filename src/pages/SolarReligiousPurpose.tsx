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

type Subtopic = {
  id: number;
  name: string;
};
import { useReportRenderer } from "../hooks/useReportRenderer";

const SolarReligiousPurpose = () => {
  const { subtopics, selectedSubtopicId } = useRoleBasedSubtopics([
    "Solar Religious Purpose (SRP)",
  ]);
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

  const renderSubtopicContent = (subtopicName: string) => {
    switch (subtopicName) {
      case "Area Wise SRP Application PIV (PIVI) To be Paid Report":
        return <AreaWiseSRPApplicationPIV />;
      case "Area Wise SRP Application PIV Status Report":
        return <AreaWiseSRPApplicationPIVStatus />;
      case "Area Wise SRP Estimation PIV (PIVII) To be Paid Report":
        return <AreaWiseSRPEstimationPIV />;

      case "Area Wise SRP Application PIV (PIVI) Paid Report":
        return <AreaWiseSRPApplicationPIVPaidReport/>;

       case "Division Wise SRP Application PIV (PIVI) To be Paid Report":
        return <DivisionWiseSRPApplicationPIVPaidReport/>;

      case "Area Wise SRP Estimation PIV (PIVII) Paid Report":
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
          {renderReport(subtopic.name, subtopic.repIdNo ?? String(subtopic.id))}
        </SubtopicCard>
      ))}
      <Outlet />
    </div>
  );
};

export default SolarReligiousPurpose;




