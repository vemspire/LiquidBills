
export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: string; // ISO String for easier storage
  isPaid: boolean;
  isRecurring: boolean;
  frequency?: BillFrequency; // New field for recurrence type
  category: BillCategory;
  seriesId?: string; // Optional ID linking recurring bills together
}

export enum BillFrequency {
  MONTHLY = 1,
  QUARTERLY = 3,
  SEMIANNUAL = 6,
  ANNUAL = 12
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
