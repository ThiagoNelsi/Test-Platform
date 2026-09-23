import { describe, expect, it, vi } from "vitest";
import { loadRuntimeSecrets } from "./runtime-secrets";

describe("runtime secrets", () => {
  it("uses direct environment values for local development", async () => {
    const getSecret = vi.fn();

    await expect(
      loadRuntimeSecrets(getSecret, {
        OPENAI_API_KEY: "openai-local",
        DATABASE_URL_POSTGRES: "postgres://application-local",
        EMBEDDINGS_DATABASE_URL: "postgres://embeddings-local",
      }),
    ).resolves.toEqual({
      openAiApiKey: "openai-local",
      applicationDatabaseUrl: "postgres://application-local",
      embeddingsDatabaseUrl: "postgres://embeddings-local",
    });
    expect(getSecret).not.toHaveBeenCalled();
  });

  it("loads separate secrets by ARN", async () => {
    const getSecret = vi.fn(async (secretId: string) => ({
      $metadata: {},
      SecretString: `${secretId}-value`,
    }));

    await expect(
      loadRuntimeSecrets(getSecret, {
        OPENAI_API_KEY_SECRET_ARN: "openai-arn",
        DATABASE_URL_POSTGRES_SECRET_ARN: "application-arn",
        EMBEDDINGS_DATABASE_URL_SECRET_ARN: "embeddings-arn",
      }),
    ).resolves.toEqual({
      openAiApiKey: "openai-arn-value",
      applicationDatabaseUrl: "application-arn-value",
      embeddingsDatabaseUrl: "embeddings-arn-value",
    });
    expect(getSecret).toHaveBeenCalledTimes(3);
  });

  it("fails when neither local values nor secret ARNs are configured", async () => {
    await expect(loadRuntimeSecrets(vi.fn(), {})).rejects.toThrow(
      "Missing required environment variable: OPENAI_API_KEY_SECRET_ARN",
    );
  });
});
