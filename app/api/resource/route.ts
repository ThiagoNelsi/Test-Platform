import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { TextractClient, ListAdaptersCommand, StartDocumentAnalysisCommand, StartDocumentTextDetectionCommand } from "@aws-sdk/client-textract";

const credentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY || "",
  secretAccessKey: process.env.AWS_SECRET_KEY || "",
}

const sqs = new SQSClient({
  apiVersion: "2012-11-05",
  region: process.env.AWS_REGION,
  credentials,
});

const textract = new TextractClient({
  region: process.env.AWS_REGION,
  credentials,
})

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user || !session.user.id) {
    return Response.json({ error: "Unauthorized" });
  }

  const { filename, fileType, objectKey, tags } = await request.json();

  try {
    const dbRef = await prisma?.resource.create({
      data: {
        filename,
        fileType,
        tags,
        objectKey,
        ownerId: session.user.id,
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
  } catch (error: any) {
    console.log("Error creating resource: ", error);
    return Response.json({ error: error.message });
  }
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user || !session.user.id) {
    return Response.json({ error: "Unauthorized" });
  }

  try {
    const dbRef = await prisma?.resource.findMany({
      where: {
        ownerId: session.user.id,
        deletedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return Response.json({ resources: dbRef });
  } catch (error: any) {
    return Response.json({ error: error.message });
  }
}