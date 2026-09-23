import {
  GetSecretValueCommand,
  SecretsManagerClient,
  type GetSecretValueCommandOutput,
} from "@aws-sdk/client-secrets-manager";

export type RuntimeSecrets = {
  openAiApiKey: string;
  applicationDatabaseUrl: string;
  embeddingsDatabaseUrl: string;
};

export type GetSecret = (secretId: string) => Promise<GetSecretValueCommandOutput>;

function requiredEnvironment(environment: NodeJS.ProcessEnv, name: string): string {
  const value = environment[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function secretValue(secretId: string, result: GetSecretValueCommandOutput): string {
  if (result.SecretString) return result.SecretString;
  if (result.SecretBinary) return Buffer.from(result.SecretBinary).toString("utf8");
  throw new Error(`Secret ${secretId} has no value`);
}

export async function loadRuntimeSecrets(
  getSecret: GetSecret,
  environment: NodeJS.ProcessEnv = process.env,
): Promise<RuntimeSecrets> {
  const localValues = {
    openAiApiKey: environment.OPENAI_API_KEY,
    applicationDatabaseUrl: environment.DATABASE_URL_POSTGRES,
    embeddingsDatabaseUrl: environment.EMBEDDINGS_DATABASE_URL,
  };

  if (Object.values(localValues).every(Boolean)) {
    return localValues as RuntimeSecrets;
  }

  const secretIds = {
    openAiApiKey: requiredEnvironment(environment, "OPENAI_API_KEY_SECRET_ARN"),
    applicationDatabaseUrl: requiredEnvironment(environment, "DATABASE_URL_POSTGRES_SECRET_ARN"),
    embeddingsDatabaseUrl: requiredEnvironment(environment, "EMBEDDINGS_DATABASE_URL_SECRET_ARN"),
  };
  const [openAiApiKey, applicationDatabaseUrl, embeddingsDatabaseUrl] = await Promise.all([
    getSecret(secretIds.openAiApiKey),
    getSecret(secretIds.applicationDatabaseUrl),
    getSecret(secretIds.embeddingsDatabaseUrl),
  ]);

  return {
    openAiApiKey: secretValue(secretIds.openAiApiKey, openAiApiKey),
    applicationDatabaseUrl: secretValue(
      secretIds.applicationDatabaseUrl,
      applicationDatabaseUrl,
    ),
    embeddingsDatabaseUrl: secretValue(secretIds.embeddingsDatabaseUrl, embeddingsDatabaseUrl),
  };
}

const secretsManager = new SecretsManagerClient({});
let cachedSecrets: Promise<RuntimeSecrets> | undefined;

export function loadAwsRuntimeSecrets(): Promise<RuntimeSecrets> {
  cachedSecrets ??= loadRuntimeSecrets((secretId) =>
    secretsManager.send(new GetSecretValueCommand({ SecretId: secretId })),
  ).catch((error: unknown) => {
    cachedSecrets = undefined;
    throw error;
  });
  return cachedSecrets;
}
