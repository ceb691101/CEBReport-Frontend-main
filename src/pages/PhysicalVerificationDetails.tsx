import { useState, useEffect } from "react";
import { useRoleBasedSubtopics } from "../hooks/useRoleBasedSubtopics";
import SubtopicCard from "../components/shared/SubtopicCard";
import PHVValidation from "../mainTopics/PhysicalVerification/PHVValidation";
import PHVEntryForm from "../mainTopics/PhysicalVerification/PHVEntryForm";
import PHVValidationWarehousewise from "../mainTopics/PhysicalVerification/PHVValidationWarehousewise";
import AnnualVerificationSheetSignature from "../mainTopics/PhysicalVerification/AnnualVerificationSheetSignature";
import AnnualVerificationWHwiseSignature from "../mainTopics/PhysicalVerification/AnnualVerificationWHwiseSignature";
import PHVSlowNonMovingWHwise from "../mainTopics/PhysicalVerification/PHVSlowNonMovingWHwise";
import PHVShortageSurplusWHwise from "../mainTopics/PhysicalVerification/PHVShortageSurplusWHwise";
import PHVObsoleteIdle from "../mainTopics/PhysicalVerification/PHVObsoleteIdle";
import PHVDamage from "../mainTopics/PhysicalVerification/PHVDamage";
import PHVNonMovingWHwiseBOS from "../mainTopics/PhysicalVerification/PHVNonMovingWHwiseBOS";
import PHVObsoleteIdleBOS from "../mainTopics/PhysicalVerification/PHVObsoleteIdleBOS";
import PHVDamageBOS from "../mainTopics/PhysicalVerification/PHVDamageBOS";
import LastDocNo from "../mainTopics/PhysicalVerification/LastDocNo";
import { matchesReportName } from "../utils/reportNameMatch";


const PhysicalVerificationDetails = () => {
    const { subtopics, selectedSubtopicId } = useRoleBasedSubtopics(["Physical Verification"]);
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
            case matchesReportName(subtopicName, "1. PHV Entry Form"):
                return <PHVEntryForm />;

            case matchesReportName(subtopicName, "2.1 PHV Validation"):
                return <PHVValidation />;

            case matchesReportName(subtopicName, "2.2 PHV Validation (Warehousewise)"):
                return <PHVValidationWarehousewise/>;

            
            case matchesReportName(subtopicName, "3.1 Annual Verification Sheet (Signature) - AV/1/A"):
                return <AnnualVerificationSheetSignature/>;

            case matchesReportName(subtopicName, "3.2 Annual Verification sheet (WHwise Signature) - AV/1/A"):
                return <AnnualVerificationWHwiseSignature/>;
         
            case matchesReportName(subtopicName, "4. Physical Verification Non-Moving / Slow-Moving WH wise AV/6"):
                return <PHVSlowNonMovingWHwise/>;

            case matchesReportName(subtopicName, "5. Physical Verification Shortage / Surplus WH wise AV/1/B"):
                return <PHVShortageSurplusWHwise/>;

            case matchesReportName(subtopicName, "6.1 Physical Verification Obsolete / Idle(GRADE Code) AV/7A"):
                return <PHVObsoleteIdle/>;

            case matchesReportName(subtopicName, "6.2 Physical Verification Damage AV/7B"):
                return <PHVDamage/>;
         
            case matchesReportName(subtopicName, "7. Physical Verification Non-Moving WH wise.BOS - AV/6/BOS"):
                return <PHVNonMovingWHwiseBOS/>;

            case matchesReportName(subtopicName, "8. Physical Verification Obsolete Idle BOS - AV/7A/BOS"):
                return <PHVObsoleteIdleBOS/>;

            case matchesReportName(subtopicName, "9. Physical Verification Damage BOS - AV/7B/BOS"):
                return <PHVDamageBOS/>;

            case matchesReportName(subtopicName, "10. Last Document No - Selected Year"):
                return <LastDocNo/>;



            default:
                return (
                    <div className="text-red-500 text-xs">
                        No content available for {subtopicName}
                    </div>
                );
        }
    };

    return (
        <div className="flex flex-col gap-4 pt-4 px-10">
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

export default PhysicalVerificationDetails;

