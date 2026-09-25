import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { StartDocumentAnalysisCommand, TextractClient } from "@aws-sdk/client-textract";
import { createHash } from "node:crypto";
import postgres from "postgres";
import {
  createPendingUploadExpiration,
  type PendingUploadExpirationPorts,
  type StalePendingUpload,
} from "../uploads/pending-upload-expiration";
import {
  createUploadConfirmationProcessor,
  type UploadConfirmationPorts,
  type UploadResource,
} from "../uploads/upload-confirmation";

const secrets = new SecretsManagerClient({});
const textract = new TextractClient({});
const s3 = new S3Client({});
let databaseUrl: Promise<string> | undefined;
let database: ReturnType<typeof postgres> | undefined;

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

async function loadDatabaseUrl(): Promise<string> {
  if (process.env.DATABASE_URL_POSTGRES) return process.env.DATABASE_URL_POSTGRES;
  databaseUrl ??= secrets.send(new GetSecretValueCommand({
    SecretId: requiredEnvironment("DATABASE_URL_POSTGRES_SECRET_ARN"),
  })).then((result) => {
    if (result.SecretString) return result.SecretString;
    if (result.SecretBinary) return Buffer.from(result.SecretBinary).toString("utf8");
    throw new Error("Application database secret has no value");
  }).catch((error: unknown) => {
    databaseUrl = undefined;
    throw error;
  });
  return databaseUrl;
}

async function getDatabase() {
  database ??= postgres(await loadDatabaseUrl(), { max: 2 });
  return database;
}

export async function createAwsUploadConfirmationProcessor() {
  const db = await getDatabase();
  const bucketName = requiredEnvironment("UPLOADED_RESOURCES_BUCKET");
  const outputBucketName = requiredEnvironment("TEXTRACT_OUTPUT_BUCKET");
  const snsTopicArn = requiredEnvironment("TEXTRACT_SNS_TOPIC_ARN");
  const snsRoleArn = requiredEnvironment("TEXTRACT_SNS_ROLE_ARN");

  const ports: UploadConfirmationPorts = {
    confirmPending: async (objectKey) => {
      await db`
        UPDATE "public"."Resource"
        SET status = 'UPLOADED', "updatedAt" = NOW()
        WHERE "objectKey" = ${objectKey} AND status = 'PENDING_UPLOAD'
      `;
    },
    findByObjectKey: async (objectKey) => {
      const rows = await db<UploadResource[]>`
        SELECT id, "documentId", "objectKey", status::text
        FROM "public"."Resource"
        WHERE "objectKey" = ${objectKey}
        LIMIT 1
      `;
      return rows[0];
    },
    startProcessing: async (objectKey) => {
      const response = await textract.send(new StartDocumentAnalysisCommand({
        FeatureTypes: ["LAYOUT"],
        DocumentLocation: { S3Object: { Bucket: bucketName, Name: objectKey } },
        OutputConfig: { S3Bucket: outputBucketName },
        ClientRequestToken: createHash("sha256").update(objectKey).digest("hex"),
        NotificationChannel: { SNSTopicArn: snsTopicArn, RoleArn: snsRoleArn },
      }));
      if (!response.JobId) throw new Error(`Textract did not return a job id for ${objectKey}`);
      return response.JobId;
    },
    markProcessing: async (id, jobId) => {
      await db`
        UPDATE "public"."Resource"
        SET status = 'PROCESSING', "jobId" = ${jobId}, "updatedAt" = NOW()
        WHERE id = ${id} AND status = 'UPLOADED'
      `;
    },
  };

  return createUploadConfirmationProcessor(ports, bucketName);
}


function isNotFound(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return candidate.name === "NotFound" || candidate.name === "NoSuchKey" ||
    candidate.$metadata?.httpStatusCode === 404;
}

export async function createAwsPendingUploadExpiration() {
  const db = await getDatabase();
  const bucketName = requiredEnvironment("UPLOADED_RESOURCES_BUCKET");
  const expirationHours = Number(requiredEnvironment("PENDING_UPLOAD_EXPIRATION_HOURS"));
  const reconcileUpload = await createAwsUploadConfirmationProcessor();

  const ports: PendingUploadExpirationPorts = {
    listStale: async (cutoff) => db<StalePendingUpload[]>`
      SELECT id, "documentId", "objectKey"
      FROM "public"."Resource"
      WHERE status = 'PENDING_UPLOAD' AND "updatedAt" < ${cutoff}
      ORDER BY "updatedAt" ASC
      LIMIT 100
    `,
    objectExists: async (objectKey) => {
      try {
        await s3.send(new HeadObjectCommand({ Bucket: bucketName, Key: objectKey }));
        return true;
      } catch (error) {
        if (isNotFound(error)) return false;
        throw error;
      }
    },
    reconcile: async (objectKey) => reconcileUpload({
      bucket: bucketName,
      objectKey,
      eventName: "ScheduledReconciliation",
    }),
    expire: async (id, cutoff) => {
      await db`
        UPDATE "public"."Resource"
        SET status = 'EXPIRED', "updatedAt" = NOW()
        WHERE id = ${id}
          AND status = 'PENDING_UPLOAD'
          AND "updatedAt" < ${cutoff}
      `;
    },
  };

  return createPendingUploadExpiration(ports, expirationHours);
}
