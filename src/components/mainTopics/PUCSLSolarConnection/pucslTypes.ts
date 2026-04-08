// ── pucslTypes.ts ─────────────────────────────────────────────────────────────
// Shared TypeScript interfaces for the PUCSL Solar Connection reports.

export interface BillCycleOption {
    display: string;
    code: string;
}

export interface Province {
    ProvinceCode: string;
    ProvinceName: string;
    ErrorMessage?: string | null;
}

export interface Division {
    RegionCode: string;
    ErrorMessage?: string | null;
}

// ── Fixed Solar Data (Report 1) ───────────────────────────────────────────────

export interface FixedSolarDataModel {
    Category: string;
    Year: string;
    Month: string;
    NoOfCustomers: number;
    OrdinaryNoOfCustomers: number;
    BulkNoOfCustomers: number;
    KwhAt1550: number;
    KwhAt22: number;
    KwhAt3450: number;
    KwhAt37: number;
    KwhAt2318: number;
    KwhAt2706: number;
    KwhOthers: number;
    PaidAmount: number;
    ErrorMessage?: string;
}

// ── Variable Solar Data (Report 2) ────────────────────────────────────────────

export interface VariableSolarDataModel {
    Category: string;
    Year: string;
    Month: string;
    // 0 < capacity <= 20 kW
    NoOfCustomers0To20: number;
    KwhUnits0To20: number;
    PaidAmount0To20: number;
    // 20 < capacity <= 100 kW
    NoOfCustomers20To100: number;
    KwhUnits20To100: number;
    PaidAmount20To100: number;
    // 100 < capacity <= 500 kW
    NoOfCustomers100To500: number;
    KwhUnits100To500: number;
    PaidAmount100To500: number;
    // capacity > 500 kW
    NoOfCustomersAbove500: number;
    KwhUnitsAbove500: number;
    PaidAmountAbove500: number;
    // Aggregator Scheme
    NoOfCustomersAggregator: number;
    KwhUnitsAggregator: number;
    PaidAmountAggregator: number;
    ErrorMessage?: string;
}

// ── Total Solar Customers (Report 3) ─────────────────────────────────────────

export interface OrdinaryData {
    TariffCategory: string;
    NetMeteringCustomers: number;
    NetMeteringUnits: number;
    NetAccountingCustomers: number;
    NetAccountingUnits: number;
    NetPlusCustomers: number;
    NetPlusUnits: number;
    NetPlusPlusCustomers: number;
    NetPlusPlusUnits: number;
}

export interface BulkData {
    TariffCategory: string;
    NetMeteringCustomers: number;
    NetMeteringUnits: number;
    NetAccountingCustomers: number;
    NetAccountingUnits: number;
    NetPlusCustomers: number;
    NetPlusUnits: number;
    NetPlusPlusCustomers: number;
    NetPlusPlusUnits: number;
}

export interface TotalSolarCustomersResponse {
    Ordinary: OrdinaryData[];
    OrdinaryTotal: OrdinaryData;
    Bulk: BulkData[];
    BulkTotal: BulkData;
    ErrorMessage?: string;
}

// ── Raw Data for Solar (Report 4) ─────────────────────────────────────────────

export interface RawSolarData {
    Category: string;
    Year: string;
    Month: string;
    ImportDay: number;
    ImportPeak: number;
    ImportOffPeak: number;
    ExportDay: number;
    ExportPeak: number;
    ExportOffPeak: number;
    BroughtForwardKwh: number;  // Only in Net Metering
    CarryForwardKwh: number;    // Only in Net Metering
}

export interface RawDataForSolarResponse {
    Ordinary: RawSolarData[];
    OrdinaryTotal: RawSolarData;
    Bulk: RawSolarData[];
    BulkTotal: RawSolarData;
    ErrorMessage?: string;
}

// ── Net Metering (Report 5) ───────────────────────────────────────────────────

export interface NetMeteringData {
    Category: string;
    Year: string;
    Month: string;
    NoOfCustomers: number;
    UnitsDayKwh: number;
    UnitsPeakKwh: number;    // Bulk only — not displayed in table
    UnitsOffPeakKwh: number; // Bulk only — not displayed in table
}

export interface NetMeteringResponse {
    Data: NetMeteringData[];
    Total: NetMeteringData;
    ErrorMessage?: string;
}