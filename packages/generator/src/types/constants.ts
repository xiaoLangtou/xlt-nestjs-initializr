import { ModuleId } from './enums.js';

export const MODULE_DEPENDENCIES: Record<string, string[]> = {
  [ModuleId.GraphQL]: [ModuleId.Config],
  [ModuleId.TypeORM]: [ModuleId.Config],
  [ModuleId.Prisma]: [ModuleId.Config],
  [ModuleId.Bull]: [ModuleId.Config],
};

export const MUTUAL_EXCLUSIONS: [string, string][] = [
  [ModuleId.TypeORM, ModuleId.Prisma],
];
