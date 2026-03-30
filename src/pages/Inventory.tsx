import { useState, useEffect } from "react";
import { useRoleBasedSubtopics } from "../hooks/useRoleBasedSubtopics";
import MaterialMaster from "../mainTopics/inventory/MaterialMaster";
import SubtopicCard from "../components/shared/SubtopicCard";
import AverageConsumptions from "../mainTopics/inventory/AverageConsumptions";
import CostCenterQuantityHnad from "../mainTopics/inventory/CostCenterQuantityHnad";
import AverageConsumptionSelected from "../mainTopics/inventory/AverageConsumptionSelected";
import QtyOnHandAllRegion from "../mainTopics/inventory/QtyOnHandAllRegions";
import ProvincialQtyHand from "../mainTopics/inventory/provincialQtyHand";
import { matchesReportName } from "../utils/reportNameMatch";

const Inventory = () => {
  const { subtopics, selectedSubtopicId } = useRoleBasedSubtopics(["Inventory"]);
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
			case matchesReportName(subtopicName, "Material Details"):
				return <MaterialMaster />;
			case matchesReportName(subtopicName, "Cost Center wise Quantity on Hand"):
				return <CostCenterQuantityHnad />;

      case matchesReportName(subtopicName, "Provincial Quantity on Hand - Cross Tab"):
				return <ProvincialQtyHand/>;


			case matchesReportName(subtopicName, "Average Consumptions - All Material Codes"):
				return <AverageConsumptions />;
			case matchesReportName(subtopicName, "Average Consumptions - Selected Maerial Codes"):
				return <AverageConsumptionSelected />;
			case matchesReportName(subtopicName, "Quantity on Hand All Region Material (Active ,Online )"):
				return <QtyOnHandAllRegion/>;

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

export default Inventory;

