export interface Plan {
  id: string;
  date: string;       // YYYY-MM-DD — the day this plan is for
  text: string;
  orderIndex?: number;
  checkedDate?: string; // YYYY-MM-DD — set to today when checked, auto-unchecks the next day
}
