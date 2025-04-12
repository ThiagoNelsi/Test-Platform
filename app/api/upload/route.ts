import { createPresignedPost } from '@aws-sdk/s3-presigned-post'
import { ListObjectsCommand, S3Client } from '@aws-sdk/client-s3'
import { v4 as uuidv4 } from 'uuid'

const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY ?? "",
    secretAccessKey: process.env.AWS_SECRET_KEY ?? "",
  },
  region: process.env.AWS_REGION,
})

export async function POST(request: Request) {
  const { contentType } = await request.json();

  try {
    const { url, fields } = await createPresignedPost(s3, {
      Bucket: process.env.AWS_BUCKET_NAME ?? "",
      Key: uuidv4(),
      Conditions: [
        ['content-length-range', 0, 10485760], // up to 10 MB
        ['starts-with', '$Content-Type', contentType],
      ],
      Fields: {
        acl: 'public-read',
        'Content-Type': contentType,
      },
      Expires: 600, // Seconds before the presigned post expires. 3600 by default.
    })

    return Response.json({ url, fields })
  } catch (error: any) {
    return Response.json({ error: error.message })
  }
}

export async function GET(request: Request) {
  const response = await s3.send(new ListObjectsCommand({
    Bucket: process.env.AWS_BUCKET_NAME ?? "",
  }));
  return Response.json(response?.Contents ?? []);
}