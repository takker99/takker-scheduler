export function generate(
  source: string,
  options?: GenerateOptions,
): GenerateResult;

export interface GenerateOptions {
  comment?: boolean;
  autoGlobalExports?: boolean;
  exportsIdentifierName?: string;
  globalIdentifierName?: string;
}

export interface GenerateResult {
  entryPointFunctions: string;
  globalAssignments: string | undefined;
}
