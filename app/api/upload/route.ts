import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucketName = process.env.R2_BUCKET_NAME;
    const publicBaseUrl = process.env.R2_PUBLIC_URL;

    if (
      !accountId ||
      !accessKeyId ||
      !secretAccessKey ||
      !bucketName ||
      !publicBaseUrl
    ) {
      console.error("Missing required R2 environment variables.");
      return NextResponse.json(
        { error: "Upload service is not configured." },
        { status: 500 },
      );
    }

    const s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File) || !file.type) {
      return NextResponse.json(
        { error: "An audio file with a content type is required." },
        { status: 400 },
      );
    }

    const key = `audio-notes/${Date.now()}-${file.name}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: file,
      ContentType: file.type,
    });

    await s3Client.send(command);
    const publicUrl = `${publicBaseUrl}/${key}`;

    return NextResponse.json({ publicUrl, key });
  } catch (err) {
    console.error("R2 upload error:", err);
    return NextResponse.json({ error: "Failed to upload audio" }, { status: 500 });
  }
}
