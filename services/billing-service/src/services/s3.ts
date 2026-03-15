import AWS from 'aws-sdk';
import logger from '../utils/logger';

const s3 = new AWS.S3({
  endpoint: process.env.S3_ENDPOINT,
  accessKeyId: process.env.S3_ACCESS_KEY,
  secretAccessKey: process.env.S3_SECRET_KEY,
  region: process.env.S3_REGION || 'us-east-1',
  s3ForcePathStyle: true,
  signatureVersion: 'v4',
});

const BUCKET = process.env.S3_BUCKET || 'energix-invoices';

export const uploadFile = async (
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> => {
  try {
    await s3
      .putObject({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
      .promise();

    const url = `${process.env.S3_ENDPOINT}/${BUCKET}/${key}`;
    logger.info(`File uploaded to S3: ${key}`);
    return url;
  } catch (error) {
    logger.error('S3 upload error:', error);
    throw error;
  }
};

export const getSignedUrl = async (key: string, expiresIn: number = 3600): Promise<string> => {
  try {
    const url = await s3.getSignedUrlPromise('getObject', {
      Bucket: BUCKET,
      Key: key,
      Expires: expiresIn,
    });
    return url;
  } catch (error) {
    logger.error('S3 signed URL error:', error);
    throw error;
  }
};

export const deleteFile = async (key: string): Promise<void> => {
  try {
    await s3
      .deleteObject({
        Bucket: BUCKET,
        Key: key,
      })
      .promise();
    logger.info(`File deleted from S3: ${key}`);
  } catch (error) {
    logger.error('S3 delete error:', error);
    throw error;
  }
};

export const ensureBucket = async (): Promise<void> => {
  try {
    await s3.headBucket({ Bucket: BUCKET }).promise();
    logger.info(`S3 bucket ${BUCKET} exists`);
  } catch {
    logger.info(`Creating S3 bucket: ${BUCKET}`);
    await s3.createBucket({ Bucket: BUCKET }).promise();
  }
};
