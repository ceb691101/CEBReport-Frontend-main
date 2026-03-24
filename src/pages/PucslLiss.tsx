import { useState, useEffect } from "react";
import { data as sidebarData } from "../data/SideBarData";
import SubtopicCard from "../components/shared/SubtopicCard";
import PUCSLSolarConnection from "../mainTopics/PUCSL/PUCSLSolarConnection";

type Subtopic = {
  id: number;
  name: string;
};

const PucslLiss = () => {
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  useEffect(() => {
    // Get PUCSL/LISS topic's subtopics directly from sidebarData
    const pucslTopic = sidebarData.find((topic) => topic.name === "PUCSL/LISS");
    if (pucslTopic) {
      setSubtopics(pucslTopic.subtopics);
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
      case "LISS submission – retail journal adjustments":
      case "PUCSL Reports (LISS Data)":
      case "PUCSL Reports – solar connections (New)":
        return <PUCSLSolarConnection />;
      case "Solar data for UNT calculation":
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

export default PucslLiss;
