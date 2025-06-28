export interface DashboardQuery {
  incomeYear?: number;
  joinYear?: number;
  role?: string;
}

export interface MonthlyIncome {
  month: string;
  income: number;
}

export interface MonthlyUsers {
  month: string;
  total: number;
}

export interface DashboardData {
  totalUsers: number;
  totalPayout: number;
  totalCustomers: number;
  totalDriver: number;
  totalIncome: number;
  toDayIncome: number;
  monthlyIncome: MonthlyIncome[];
  monthlyUsers: MonthlyUsers[];
}
