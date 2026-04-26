const NPM_NAME_REGEX = /^[a-z0-9][a-z0-9._-]*$/;

export function validateProjectName(name: string): boolean {
  if (!name) return false;
  if (name.length < 1 || name.length > 214) return false;
  return NPM_NAME_REGEX.test(name);
}
