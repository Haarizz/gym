export interface UserTarget {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  unit: string;
  deadline: string;
  status: 'active' | 'completed' | 'overdue';
  category: string;
}
