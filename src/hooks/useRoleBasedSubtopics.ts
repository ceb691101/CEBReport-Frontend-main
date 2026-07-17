import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  data as sidebarData,
  loadRoleBasedSidebarData,
  type Topic,
} from "../data/SideBarData.ts";
import { useUser } from "../contexts/UserContext";

export type RoleSubtopic = {
  id: number;
  name: string;
  repIdNo?: string;
};

type SidebarLocationState = {
  subtopics?: Array<{ id: number; name: string; repIdNo?: string }>;
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
  const { user } = useUser();
  const epfNo = user?.Userno ?? "";
  const state = (location.state as SidebarLocationState | null) ?? null;
  const [dynamicSubtopics, setDynamicSubtopics] = useState<RoleSubtopic[]>([]);

  const selectedSubtopicId =
    typeof state?.selectedSubtopicId === "number" ? state.selectedSubtopicId : null;

  const normalizedNames = useMemo(
    () => new Set(categoryNames.map(normalize)),
    [categoryNames.join("|")]
  );

  const routeStateSubtopics =
    Array.isArray(state?.subtopics) && state.subtopics.length > 0
      ? state.subtopics
      : null;

  useEffect(() => {
    let cancelled = false;

    const loadFallbackSubtopics = async () => {
      if (!epfNo.trim()) {
        return;
      }

      const result = await loadRoleBasedSidebarData(epfNo);
      if (cancelled) {
        return;
      }

      const matchedTopic = result.data.find((topic) =>
        normalizedNames.has(normalize(topic.name))
      );

      const subtopics: RoleSubtopic[] = (matchedTopic?.subtopics ?? []).map((subtopic) => ({
        id: subtopic.id,
        name: subtopic.name,
        repIdNo: subtopic.repIdNo,
      }));

      setDynamicSubtopics(subtopics);
    };

    void loadFallbackSubtopics();

    return () => {
      cancelled = true;
    };
  }, [epfNo, normalizedNames]);

  const matchedStaticTopic = sidebarData.find((topic: Topic) => normalizedNames.has(normalize(topic.name)));

  const staticSubtopics: RoleSubtopic[] = (matchedStaticTopic?.subtopics ?? []).map((subtopic) => ({
    id: subtopic.id,
    name: subtopic.name,
    repIdNo: subtopic.repIdNo,
  }));

  const fallbackSubtopics =
    dynamicSubtopics.length > 0 ? dynamicSubtopics : staticSubtopics;

  return {
    subtopics: routeStateSubtopics ?? fallbackSubtopics,
    selectedSubtopicId,
  };
};
