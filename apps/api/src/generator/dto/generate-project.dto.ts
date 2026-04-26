import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  Matches,
  Length,
  MaxLength,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  Validate,
} from 'class-validator';
import {
  HttpAdapter,
  PackageManager,
  LinterOption,
  TestRunner,
  GitHooksOption,
  ModuleId,
  DatabaseType,
} from '@nestjs-initializr/generator';

@ValidatorConstraint({ name: 'mutualExclusion', async: false })
export class MutualExclusionConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const obj = args.object as GenerateProjectDto;
    const modules = obj.modules ?? [];
    // TypeORM and Prisma are mutually exclusive
    if (modules.includes(ModuleId.TypeORM) && modules.includes(ModuleId.Prisma)) {
      return false;
    }
    return true;
  }

  defaultMessage(): string {
    return 'TypeORM 和 Prisma 不能同时选择';
  }
}

export class GenerateProjectDto {
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9._-]*$/, { message: '项目名称必须符合 npm 包命名规范' })
  @Length(1, 214)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsEnum(HttpAdapter)
  adapter!: HttpAdapter;

  @IsEnum(PackageManager)
  packageManager!: PackageManager;

  @IsEnum(LinterOption)
  linter!: LinterOption;

  @IsEnum(TestRunner)
  testRunner!: TestRunner;

  @IsEnum(GitHooksOption)
  gitHooks!: GitHooksOption;

  @IsArray()
  @IsEnum(ModuleId, { each: true })
  modules!: ModuleId[];

  @IsOptional()
  @IsEnum(DatabaseType)
  databaseType?: DatabaseType;

  @Validate(MutualExclusionConstraint)
  _mutualExclusion?: never;
}
