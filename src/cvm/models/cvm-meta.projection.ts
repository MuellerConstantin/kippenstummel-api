export interface CvmMetaProjection {
  count: number;
  countImported: number;
  countRegistered: number;
  totalLast7Days: number;
  registrationHistory: {
    date: string;
    count: number;
  }[];
}
