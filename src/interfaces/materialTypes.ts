// Shared types and interfaces for material inventory

export interface Material {
  MatCd: string;
  MatNm: string;
}

export interface MaterialMasterProps {
  title?: string;
}

export type MaterialStock = {
  ErrorMessage: string | null;
  MatCd: string;
  QtyOnHand: number;
  Region: string;
  MatNm?: string;
};

export type ProvinceStock = {
  ErrorMessage: string | null;
  MatCd: string;
  QtyOnHand: number;
  Province: string;
  MatNm?: string;
  Region?: string;
};

export type StockBalance = {
  MatCd: string;
  Region: string;
  Province: string;
  DeptId: string;
  MatNm: string;
  GradeCd?: string;
  UnitPrice: number;
  QtyOnHand: number;
  CommittedCost?: number;
  ReorderQty: number;
  UomCd: string;
  ErrorMessage: string | null;
};
