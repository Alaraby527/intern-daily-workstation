import type { Intern } from '@shared/api.interface';

export const INTERNS: Intern[] = [
  { name: '实习生A', lineCodes: ['A', 'E'] },
  { name: '实习生B', lineCodes: ['A', 'C'] },
  { name: '实习生C', lineCodes: ['A', 'C'] },
  { name: '实习生D', lineCodes: ['A', 'C'] },
  { name: '实习生E', lineCodes: ['B', 'C'] },
  { name: '实习生F', lineCodes: ['B', 'C'] },
  { name: '实习生G', lineCodes: ['C', 'D'] },
  { name: '实习生H', lineCodes: ['C'] },
  { name: '实习生I', lineCodes: ['D', 'E'] },
  { name: '实习生J', lineCodes: ['D', 'E'] },
  { name: '实习生K', lineCodes: ['D', 'E'] },
  { name: '实习生L', lineCodes: ['D', 'E'] },
  { name: '实习生M', lineCodes: ['C', 'E'] },
];

export const getInternByName = (name: string): Intern | undefined =>
  INTERNS.find((intern: Intern) => intern.name === name);
