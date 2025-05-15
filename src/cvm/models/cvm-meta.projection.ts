export interface CvmMetaProjection {
  total: number;
  averageScore: number;
  imports: {
    total: number;
    totalLast7Days: number;
    history: {
      date: string;
      count: number;
    }[];
  };
  registrations: {
    total: number;
    totalLast7Days: number;
    history: {
      date: string;
      count: number;
    }[];
  };
}
