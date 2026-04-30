import type { ReactNode } from "react";
import {
	getReportComponent,
	getReportComponentLoose,
} from "../utils/reportComponentRegistry";
import { normalizeReportName } from "../utils/reportNameMatch";
import DynamicReportByRepId from "../components/shared/DynamicReportByRepId";
import CcApplicationProgress from "../mainTopics/SolarJobs/CcApplicationProgress";

/**
 * Hook to render a report component based on its name.
 * Returns the component if found, otherwise returns an error message.
 */
export const useReportRenderer = () => {
	return (subtopicName: string, repIdNo?: string): ReactNode => {
		const repId = repIdNo?.trim() ?? "";
		if (repId === "29") {
			return <CcApplicationProgress />;
		}

		const normalized = normalizeReportName(subtopicName);
		const withoutLeadingNumber = normalizeReportName(
			subtopicName.replace(/^\d+(?:\s*[./-]\s*\d+)*\s*/, "")
		);

		const Component =
			getReportComponent(normalized) ??
			getReportComponent(withoutLeadingNumber) ??
			getReportComponentLoose(withoutLeadingNumber);

		if (!Component) {
			return <DynamicReportByRepId repIdNo={repIdNo ?? ""} reportName={subtopicName} />;
		}

		return <Component />;
	};
};
