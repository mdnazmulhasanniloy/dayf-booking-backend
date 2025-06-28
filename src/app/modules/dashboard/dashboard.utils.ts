import moment from "moment";
import { MonthlyIncome, MonthlyUsers } from "./dashboard.interface";

// Overloads
export function initializeMonthlyData(key: 'income'): MonthlyIncome[];
export function initializeMonthlyData(key: 'total'): MonthlyUsers[];

// Implementation
export function initializeMonthlyData(
  key: 'income' | 'total',
): (MonthlyIncome | MonthlyUsers)[] {
  return Array.from({ length: 12 }, (_, index) => ({
    month: moment().month(index).format('MMM'),
    [key]: 0,
  })) as any; // Safe because overloads control output type
}
