import { GetParametersCommand, type GetParametersCommandOutput } from '@aws-sdk/client-ssm';

export const guardrailParameterPaths = {
  INPUT_GUARDRAIL_ENABLED: 'guardrail/enabled',
  INPUT_GUARDRAIL_REGION: 'guardrail/region',
  INPUT_GUARDRAIL_IDENTIFIER: 'guardrail/identifier',
  INPUT_GUARDRAIL_VERSION: 'guardrail/version',
  INPUT_GUARDRAIL_TIMEOUT_MS: 'guardrail/timeout-ms',
} as const;

export function loadGuardrailConfig(env: NodeJS.ProcessEnv = process.env) {
  const enabled = env.INPUT_GUARDRAIL_ENABLED ?? 'true';
  if (enabled !== 'true' && enabled !== 'false') throw new Error('INPUT_GUARDRAIL_ENABLED must be true or false');
  const timeoutMs = Number(env.INPUT_GUARDRAIL_TIMEOUT_MS ?? 10_000);
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) throw new Error('INPUT_GUARDRAIL_TIMEOUT_MS must be a positive integer');
  const identifier = env.INPUT_GUARDRAIL_IDENTIFIER?.trim() ?? '';
  const version = env.INPUT_GUARDRAIL_VERSION?.trim() ?? '';
  if (enabled === 'true') {
    if (!identifier) throw new Error('INPUT_GUARDRAIL_IDENTIFIER is required when input guarding is enabled');
    if (!/^[1-9][0-9]{0,7}$/.test(version)) throw new Error('INPUT_GUARDRAIL_VERSION must be a published numeric version');
  }
  return {
    enabled: enabled === 'true', identifier, version, timeoutMs,
    region: env.INPUT_GUARDRAIL_REGION || env.AWS_REGION || 'us-east-1',
  };
}

export async function loadDeployedGuardrailConfig(
  ssm: { send(command: GetParametersCommand): Promise<GetParametersCommandOutput> },
  parameterPath: string,
  env: NodeJS.ProcessEnv = process.env,
) {
  const entries = Object.entries(guardrailParameterPaths);
  const names = entries.map(([, path]) => `${parameterPath.replace(/\/$/, '')}/${path}`);
  const response = await ssm.send(new GetParametersCommand({ Names: names }));
  const values = new Map(response.Parameters?.map(({ Name, Value }) => [Name, Value]));
  const settings: NodeJS.ProcessEnv = { ...env };
  entries.forEach(([key], index) => {
    if (env[key] === undefined && values.get(names[index]) !== undefined) settings[key] = values.get(names[index]);
  });
  // Missing configuration must not silently start an unguarded production API.
  return loadGuardrailConfig(settings);
}
