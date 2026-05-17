import prisma from "@/lib/prisma";
// import { SQSClient } from '@aws-sdk/client-sqs';
import { TextractClient, StartDocumentAnalysisCommand } from "@aws-sdk/client-textract";
import { NextRequest } from "next/server";
import { ResourceStatus } from "@prisma/client";

const credentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY || "",
  secretAccessKey: process.env.AWS_SECRET_KEY || "",
}

// const sqs = new SQSClient({
//   apiVersion: "2012-11-05",
//   region: process.env.AWS_REGION,
//   credentials,
// });

const textract = new TextractClient({
  region: process.env.AWS_REGION,
  credentials,
})

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get("session")?.value;
  if (!sessionCookie) return Response.json({ error: "Unauthorized" });

  const backend = process.env.BACKEND_URL ?? "";
  const meRes = await fetch(`${backend}/auth/me`, {
    headers: { cookie: `session=${sessionCookie}` },
    cache: "no-store",
  });
  if (!meRes.ok) return Response.json({ error: "Unauthorized" });
  const me = await meRes.json();
  const userId = me?.user?.id;
  if (!userId) return Response.json({ error: "Unauthorized" });

  const { filename, fileType, objectKey, tags } = await request.json();

  try {
    const dbRef = await prisma?.resource.create({
      data: {
        filename,
        fileType,
        tags,
        objectKey,
        ownerId: userId,
        status: 'UPLOADED',
      },
    });

    const command = new StartDocumentAnalysisCommand({
      FeatureTypes: ["LAYOUT"],
      DocumentLocation: {
        S3Object: {
          Bucket: process.env.AWS_BUCKET_NAME,
          Name: objectKey,
        },
      },
      ClientRequestToken: objectKey,
      NotificationChannel: {
        SNSTopicArn: process.env.AWS_TEXTRACT_SNS_TOPIC_ARN,
        RoleArn: process.env.AWS_TEXTRACT_SNS_ROLE_ARN,
      },
    })
    const response = await textract.send(command)

    await prisma?.resource.update({
      where: {
        id: dbRef.id,
      },
      data: {
        status: 'PROCESSING',
        jobId: response.JobId,
      },
    });

    return Response.json({ resource: dbRef });
  } catch (error: unknown) {
    console.log("Error creating resource: ", error);
    return Response.json({ error: (error as Error).message });
  }
}

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get("session")?.value;
  if (!sessionCookie) return Response.json({ error: "Unauthorized" });

  const backend = process.env.BACKEND_URL ?? "";
  const meRes = await fetch(`${backend}/auth/me`, {
    headers: { cookie: `session=${sessionCookie}` },
    cache: "no-store",
  });
  if (!meRes.ok) return Response.json({ error: "Unauthorized" });
  const me = await meRes.json();
  const userId = me?.user?.id;
  if (!userId) return Response.json({ error: "Unauthorized" });

  const status = request?.nextUrl?.searchParams.get("status") as ResourceStatus | null;

  try {
    const dbRef = await prisma?.resource.findMany({
      where: {
        ownerId: userId,
        deletedAt: null,
        ...(status ? { status } : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return Response.json({ resources: dbRef });
  } catch (error: unknown) {
    return Response.json({ error: (error as Error).message });
  }
}
