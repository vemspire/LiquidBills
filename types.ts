export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: string; // ISO String for easier storage
  isPaid: boolean;
  isRecurring: boolean;
  category: BillCategory;
}

export enum BillCategory {
  HOUSE = 'Dom',
  MEDIA = 'Media',
  SUBSCRIPTION = 'Subskrypcje',
  CREDIT = 'Kredyt',
  OTHER = 'Inne'
}

export const CATEGORY_ICONS: Record<BillCategory, string> = {
  [BillCategory.HOUSE]: '🏠',
  [BillCategory.MEDIA]: '⚡',
  [BillCategory.SUBSCRIPTION]: '🎬',
  [BillCategory.CREDIT]: '🏦',
  [BillCategory.OTHER]: '📦',
};

export interface MonthlyStats {
  total: number;
  paid: number;
  pending: number;
}