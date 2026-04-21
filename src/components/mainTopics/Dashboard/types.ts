export interface CustomerCounts {
  ordinary: number;
  bulk: number;
  solar: {
    netMetering: number;
    netAccounting: number;
    netPlus: number;
    netPlusPlus: number;
  };
  zeroConsumption: number;
}

export interface TopCustomer {
  name: string;
  consumption: number;
  type: string;
}

export interface SalesData {
  ordinary: { charge: number; units: number };
  bulk: { charge: number; units: number };
  kioskCollection: number;
}

export interface MonthlySalesData {
  month: string;
  ordinary: number;
  bulk: number;
  target: number;
}

export interface MonthlyNewCustomers {
  month: string;
  ordinary: number;
  bulk: number;
}

export interface SalesCollectionRecord {
  BillCycle: number;
  Collection: number;
  Sales: number;
  ErrorMessage: string;
}

export interface SalesCollectionApiResponse {
  data: {
    maxBillCycle: number;
    records: SalesCollectionRecord[];
  };
  errorMessage: string | null;
}
