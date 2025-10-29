import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import axios from 'axios';
import { createHash } from 'crypto';
import { Logger } from './logger';

const logger = new Logger({ module: 'image-downloader' });

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'ap-northeast-1' });

interface DownloadImageOptions {
    sourceUrl: string;
    productId: string;
    brand: string;
}

interface DownloadImageResult {
    success: boolean;
    cloudFrontUrl?: string;
    s3Key?: string;
    error?: string;
}

/**
 * 画像をダウンロードしてS3にアップロード
 * @param options ダウンロードオプション
 * @returns CloudFront URL
 */
export async function downloadAndUploadImage(
    options: DownloadImageOptions
): Promise<DownloadImageResult> {
    const { sourceUrl, productId, brand } = options;
    const bucketName = process.env.IMAGES_BUCKET_NAME;
    const cloudFrontDomain = process.env.IMAGES_CLOUDFRONT_DOMAIN;

    if (!bucketName || !cloudFrontDomain) {
        logger.error('Missing environment variables', {
            bucketName: !!bucketName,
            cloudFrontDomain: !!cloudFrontDomain,
        });
        return {
            success: false,
            error: 'Missing S3 bucket or CloudFront configuration',
        };
    }

    try {
        logger.info('Downloading image', { sourceUrl, productId, brand });

        // 画像をダウンロード
        const response = await axios.get(sourceUrl, {
            responseType: 'arraybuffer',
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
        });

        const imageBuffer = Buffer.from(response.data);
        const contentType = response.headers['content-type'] || 'image/jpeg';

        // ファイル拡張子を決定
        const extension = getExtensionFromContentType(contentType);

        // S3キーを生成（brand/productId/hash.ext の形式）
        const imageHash = createHash('md5').update(imageBuffer).digest('hex').substring(0, 8);
        const s3Key = `${brand.toLowerCase()}/${productId}/${imageHash}${extension}`;

        logger.info('Uploading to S3', { s3Key, size: imageBuffer.length, contentType });

        // S3にアップロード
        await s3Client.send(
            new PutObjectCommand({
                Bucket: bucketName,
                Key: s3Key,
                Body: imageBuffer,
                ContentType: contentType,
                CacheControl: 'public, max-age=31536000', // 1年間キャッシュ
                Metadata: {
                    'product-id': productId,
                    'brand': brand,
                    'source-url': sourceUrl,
                },
            })
        );

        const cloudFrontUrl = `https://${cloudFrontDomain}/${s3Key}`;

        logger.info('Image uploaded successfully', { cloudFrontUrl, s3Key });

        return {
            success: true,
            cloudFrontUrl,
            s3Key,
        };
    } catch (error) {
        logger.error('Failed to download and upload image', {
            error: error instanceof Error ? error.message : String(error),
            sourceUrl,
            productId,
        });

        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Content-Typeからファイル拡張子を取得
 */
function getExtensionFromContentType(contentType: string): string {
    const typeMap: Record<string, string> = {
        'image/jpeg': '.jpg',
        'image/jpg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/webp': '.webp',
        'image/svg+xml': '.svg',
    };

    return typeMap[contentType.toLowerCase()] || '.jpg';
}

/**
 * 複数の画像を並列ダウンロード（レート制限あり）
 */
export async function downloadImages(
    images: DownloadImageOptions[],
    concurrency: number = 3
): Promise<DownloadImageResult[]> {
    const results: DownloadImageResult[] = [];

    for (let i = 0; i < images.length; i += concurrency) {
        const batch = images.slice(i, i + concurrency);
        const batchResults = await Promise.all(
            batch.map((img) => downloadAndUploadImage(img))
        );
        results.push(...batchResults);

        // レート制限（バッチ間で500ms待機）
        if (i + concurrency < images.length) {
            await new Promise((resolve) => setTimeout(resolve, 500));
        }
    }

    return results;
}
