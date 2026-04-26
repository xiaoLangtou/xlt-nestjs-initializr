import { Project, SyntaxKind, type SourceFile, type ArrayLiteralExpression } from 'ts-morph';
import type { FilePatch } from '../types/index.js';

export interface IConflictResolver {
  resolve(originalContent: string, patches: FilePatch[]): string;
}

export class ConflictResolver implements IConflictResolver {
  resolve(originalContent: string, patches: FilePatch[]): string {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile('temp.ts', originalContent);

    for (const patch of patches) {
      switch (patch.operation) {
        case 'addImport':
          this.addImport(sourceFile, patch.params);
          break;
        case 'addModuleImport':
          this.addModuleImport(sourceFile, patch.params);
          break;
        case 'addProvider':
          this.addProvider(sourceFile, patch.params);
          break;
        case 'addBootstrapCode':
          this.addBootstrapCode(sourceFile, patch.params);
          break;
      }
    }

    return sourceFile.getFullText();
  }

  private addImport(sourceFile: SourceFile, params: Record<string, unknown>): void {
    const moduleSpecifier = params.moduleSpecifier as string;
    const namedImports = params.namedImports as string[] | undefined;
    const defaultImport = params.defaultImport as string | undefined;

    // Check for existing import from the same module specifier
    const existingImport = sourceFile.getImportDeclaration(moduleSpecifier);

    if (existingImport) {
      // Merge named imports if needed
      if (namedImports) {
        const existingNamedImports = existingImport.getNamedImports().map(n => n.getName());
        const newImports = namedImports.filter(n => !existingNamedImports.includes(n));
        if (newImports.length > 0) {
          existingImport.addNamedImports(newImports);
        }
      }
      return;
    }

    sourceFile.addImportDeclaration({
      moduleSpecifier,
      namedImports: namedImports ?? undefined,
      defaultImport: defaultImport ?? undefined,
    });
  }

  private addModuleImport(sourceFile: SourceFile, params: Record<string, unknown>): void {
    const moduleName = params.moduleName as string;
    const importCode = params.importCode as string | undefined;

    const importsArray = this.findDecoratorArray(sourceFile, 'imports');
    if (!importsArray) return;

    const expression = importCode ?? moduleName;

    // Check if already present
    const existingElements = importsArray.getElements().map(e => e.getText());
    if (existingElements.some(e => e === expression || e.startsWith(`${moduleName}.`) || e === moduleName)) {
      return;
    }

    importsArray.addElement(expression);
  }

  private addProvider(sourceFile: SourceFile, params: Record<string, unknown>): void {
    const providerName = params.providerName as string;

    const providersArray = this.findDecoratorArray(sourceFile, 'providers');
    if (!providersArray) return;

    // Check if already present
    const existingElements = providersArray.getElements().map(e => e.getText());
    if (existingElements.includes(providerName)) {
      return;
    }

    providersArray.addElement(providerName);
  }

  private addBootstrapCode(sourceFile: SourceFile, params: Record<string, unknown>): void {
    const code = params.code as string;
    const beforeListen = params.beforeListen as boolean | undefined;

    // Find the bootstrap function
    const bootstrapFn =
      sourceFile.getFunction('bootstrap') ??
      sourceFile.getVariableDeclaration('bootstrap');

    if (!bootstrapFn) return;

    const fnBody = bootstrapFn.getKind() === SyntaxKind.FunctionDeclaration
      ? sourceFile.getFunction('bootstrap')!.getBody()
      : undefined;

    if (!fnBody || fnBody.getKind() !== SyntaxKind.Block) return;

    const block = fnBody.asKindOrThrow(SyntaxKind.Block);
    const statements = block.getStatements();

    if (beforeListen) {
      // Find app.listen() call and insert before it
      const listenIndex = statements.findIndex(s => s.getText().includes('.listen('));
      if (listenIndex >= 0) {
        block.insertStatements(listenIndex, code);
        return;
      }
    }

    // Append before the last statement (usually app.listen or return)
    const lastIndex = statements.length;
    if (lastIndex > 0 && beforeListen !== false) {
      block.insertStatements(lastIndex - 1, code);
    } else {
      block.addStatements(code);
    }
  }

  private findDecoratorArray(sourceFile: SourceFile, propertyName: string): ArrayLiteralExpression | undefined {
    // Find @Module decorator
    const classes = sourceFile.getClasses();
    for (const cls of classes) {
      const moduleDecorator = cls.getDecorator('Module');
      if (!moduleDecorator) continue;

      const args = moduleDecorator.getArguments();
      if (args.length === 0) continue;

      const objectLiteral = args[0].asKind(SyntaxKind.ObjectLiteralExpression);
      if (!objectLiteral) continue;

      const property = objectLiteral.getProperty(propertyName);
      if (!property) {
        // Property doesn't exist yet, add it
        const newProp = objectLiteral.addPropertyAssignment({
          name: propertyName,
          initializer: '[]',
        });
        return newProp.getInitializerIfKind(SyntaxKind.ArrayLiteralExpression);
      }

      if (property.getKind() === SyntaxKind.PropertyAssignment) {
        const assignment = property.asKindOrThrow(SyntaxKind.PropertyAssignment);
        return assignment.getInitializerIfKind(SyntaxKind.ArrayLiteralExpression);
      }
    }

    return undefined;
  }
}
