import { normalizeReportName } from "./reportNameMatch";

export const TOTAL_CUSTOMER_BASE_NAME = "Total customer base";

export const withTotalCustomerBase = <T extends { id: number; name: string }>(
  subtopics: readonly T[]
) => {
  if (subtopics.some((subtopic) =>
    normalizeReportName(subtopic.name) === normalizeReportName(TOTAL_CUSTOMER_BASE_NAME)
  )) {
    return [...subtopics];
  }

  return [
    ...subtopics,
    {
      id: Math.min(0, ...subtopics.map((subtopic) => subtopic.id)) - 1,
      repIdNo: "",
      name: TOTAL_CUSTOMER_BASE_NAME,
    },
  ];
};
