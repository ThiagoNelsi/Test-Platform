export function getRequiredEnv(name: string, env: NodeJS.ProcessEnv = process.env): string {
  const value = env[name];

  if (!value) {
    throw new Error(`${name} not defined in .env`);
  }

  return value;
}

export function getOptionalEnv(
  name: string,
  fallback: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  return env[name] ?? fallback;
}
