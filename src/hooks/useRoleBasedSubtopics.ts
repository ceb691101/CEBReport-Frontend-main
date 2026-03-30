import { useLocation } from "react-router-dom";
import { data as sidebarData, type Topic } from "../data/SideBarData.ts";

export type RoleSubtopic = {
  id: number;
  name: string;
};

type SidebarLocationState = {
  subtopics?: Array<{ id: number; name: string }>;
  selectedSubtopicId?: number;
};

const normalize = (value: string): string =>
  value
    .trim()
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s+/g, " ")
    .toLowerCase();

export const useRoleBasedSubtopics = (categoryNames: string[]) => {
  const location = useLocation();
  const state = (location.state as SidebarLocationState | null) ?? null;

  const selectedSubtopicId =
    typeof state?.selectedSubtopicId === "number" ? state.selectedSubtopicId : null;

  if (Array.isArray(state?.subtopics) && state.subtopics.length > 0) {
    return {
      subtopics: state.subtopics,
      selectedSubtopicId,
    };
  }

  const normalizedNames = new Set(categoryNames.map(normalize));
  const matchedTopic = sidebarData.find((topic: Topic) =>
    normalizedNames.has(normalize(topic.name))
  );

  const subtopics: RoleSubtopic[] = (matchedTopic?.subtopics ?? []).map((subtopic) => ({
    id: subtopic.id,
    name: subtopic.name,
  }));

  return {
    subtopics,
    selectedSubtopicId,
  };
};
