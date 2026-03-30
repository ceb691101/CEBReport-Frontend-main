import { useState, useEffect } from "react";
import { useRoleBasedSubtopics } from "../hooks/useRoleBasedSubtopics";
import { Outlet } from "react-router-dom";
import SubtopicCard from "../components/shared/SubtopicCard";

import AreaWiseSRPApplicationPIV from "../mainTopics/SRP/AreaWiseSRPApplicationPIV";
import AreaWiseSRPApplicationPIVPaidReport from "../mainTopics/SRP/AreaWiseSRPApplicationPIVPaidReport";
import DivisionWiseSRPApplicationPIVPaidReport from "../mainTopics/SRP/DivisionWiseSRPApplicationPIVPaidReport";
import AreaWiseSRPEstimationPIVPaidReport from "../mainTopics/SRP/AreaWiseSRPEstimationPIVPaidReport";
import DivisionWiseSRPEstimationPIVPaidReport from "../mainTopics/SRP/DivisionWiseSRPEstimationPIVPaidReport";
import { matchesReportName } from "../utils/reportNameMatch";

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
    switch (true) {
      case matchesReportName(subtopicName, "Area Wise SRP Application PIV (PIVI) To be Paid Report"):
        return <AreaWiseSRPApplicationPIV />;

      case matchesReportName(subtopicName, "Area Wise SRP Application PIV (PIVI) Paid Report"):
        return <AreaWiseSRPApplicationPIVPaidReport/>;

       case matchesReportName(subtopicName, "Division Wise SRP Application PIV (PIVI) To be Paid Report"):
        return <DivisionWiseSRPApplicationPIVPaidReport/>;

      case matchesReportName(subtopicName, "Area Wise SRP Estimation PIV (PIVII) Paid Report"):
        return <AreaWiseSRPEstimationPIVPaidReport/>;

      case matchesReportName(subtopicName, "Division Wise SRP Estimation PIV (PIVII) Paid Report"):
        return <DivisionWiseSRPEstimationPIVPaidReport/>;

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
