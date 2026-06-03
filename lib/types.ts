export type SpendCategory = {
  id: string;
  name: string;
  monthlyBudget: number;
};

export type MonthlyBudget = {
  id: string;
  year: number;
  month: number;
  categories: SpendCategory[];
};

export type SpendEntry = {
  id: string;
  categoryId: string;
  date: string;
  amount: number;
  note?: string;
};

export type GoalActionItem = {
  id: string;
  title: string;
};

export type Goal = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  actionItems: GoalActionItem[];
};

export type ActionCompletion = {
  goalId: string;
  actionItemId: string;
  date: string;
};

export type TodoItem = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  dueDate?: string;
};

export type RoutineBlock = {
  id: string;
  title: string;
  startMinutes: number;
  endMinutes: number;
};

export type AppData = {
  monthlyBudgets: MonthlyBudget[];
  spendEntries: SpendEntry[];
  goals: Goal[];
  actionCompletions: ActionCompletion[];
  todos: TodoItem[];
  routineBlocks: RoutineBlock[];
};

export const EMPTY_APP_DATA: AppData = {
  monthlyBudgets: [],
  spendEntries: [],
  goals: [],
  actionCompletions: [],
  todos: [],
  routineBlocks: [],
};
