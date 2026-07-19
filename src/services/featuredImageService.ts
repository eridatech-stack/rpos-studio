import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { getOpenAIClient } from "@/lib/openai";
import {
  getWordPressAuthHeader,
  getWordPressConfig,
} from "@/lib/wordpress";
import { getArticleById } from "@/repositories/articleRepository";
import { buildImageAiUsage } from "@/services/aiUsage";
import { renderPrompt } from "@/services/promptService";

type FeaturedImageResult = {
  imageId: string;
  fileUrl: string;
  wordpressMediaId: number;
  replacedWordPressMediaIds: number[];
  deletedWordPressMediaIds: number[];
  wordpressMediaDeleteErrors: string[];
  altText: string;
  aiUsage: ReturnType<typeof buildImageAiUsage>;
};

type OpenAIImageSize =
  | "1024x1024"
  | "1536x1024"
  | "1024x1536"
  | "auto";
type OpenAIImageQuality = "low" | "medium" | "high" | "auto";
type OpenAIImageOutputFormat = "webp" | "jpeg" | "png";

export async function generateAndUploadFeaturedImage(
  articleId: string
): Promise<FeaturedImageResult> {
  const article: any = await getArticleById(articleId);

  if (!article) {
    throw new Error("Article not found.");
  }

  const prompt = addRealisticImageDirection(
    await buildFeaturedImagePrompt(article),
    article
  );
  const altText = buildAltText(article);
  const imageId = randomUUID();
  const replacedWordPressMediaIds =
    await getPreviousFeaturedImageMediaIds(article.id);

  await markPreviousFeaturedImagesSuperseded(article.id);

  await db.query(
    `
    INSERT INTO images (
      id,
      site_id,
      article_id,
      type,
      prompt,
      alt_text,
      status,
      created_at
    )
    VALUES (?, ?, ?, 'featured', ?, ?, 'new', NOW())
    `,
    [
      imageId,
      article.site_id,
      article.id,
      prompt,
      altText,
    ]
  );

  try {
    const generatedImage = await generateImageBuffer(prompt);
    const imageBuffer = generatedImage.imageBuffer;
    const fileUrl = await saveGeneratedImageFile({
      imageId,
      imageBuffer,
      outputFormat: generatedImage.outputFormat,
    });

    await db.query(
      `
      UPDATE images
      SET
        file_url = ?,
        status = 'generated'
      WHERE id = ?
      `,
      [fileUrl, imageId]
    );

    const wordpressMediaId = await uploadImageToWordPress({
      imageBuffer,
      filename: `${article.slug || imageId}-featured.${extensionForImageFormat(
        generatedImage.outputFormat
      )}`,
      contentType: contentTypeForImageFormat(generatedImage.outputFormat),
      title: article.title,
      altText,
    });

    await db.query(
      `
      UPDATE images
      SET
        wordpress_media_id = ?,
        status = 'uploaded'
      WHERE id = ?
      `,
      [wordpressMediaId, imageId]
    );

    return {
      imageId,
      fileUrl,
      wordpressMediaId,
      replacedWordPressMediaIds,
      deletedWordPressMediaIds: [],
      wordpressMediaDeleteErrors: [],
      altText,
      aiUsage: generatedImage.aiUsage,
    };
  } catch (error) {
    await db.query(
      `
      UPDATE images
      SET status = 'rejected'
      WHERE id = ?
      `,
      [imageId]
    );

    throw error;
  }
}

export async function getUploadedFeaturedImageMediaId(
  articleId: string
): Promise<number | null> {
  const [rows]: any = await db.query(
    `
    SELECT wordpress_media_id
    FROM images
    WHERE article_id = ?
      AND type = 'featured'
      AND status = 'uploaded'
      AND wordpress_media_id IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [articleId]
  );

  const mediaId = rows[0]?.wordpress_media_id;

  return mediaId ? Number(mediaId) : null;
}

export async function generateAndAttachFeaturedImage(
  articleId: string
): Promise<FeaturedImageResult> {
  const article: any = await getArticleById(articleId);

  if (!article) {
    throw new Error("Article not found.");
  }

  if (!article.wordpress_post_id) {
    throw new Error(
      "Article does not have a WordPress draft post yet."
    );
  }

  const image = await generateAndUploadFeaturedImage(articleId);

  await setWordPressPostFeaturedMedia({
    wordpressPostId: Number(article.wordpress_post_id),
    wordpressMediaId: image.wordpressMediaId,
  });

  const cleanup = await deleteReplacedWordPressMedia({
    mediaIds: image.replacedWordPressMediaIds,
    keepMediaId: image.wordpressMediaId,
  });

  return {
    ...image,
    deletedWordPressMediaIds: cleanup.deletedMediaIds,
    wordpressMediaDeleteErrors: cleanup.errors,
  };
}

async function buildFeaturedImagePrompt(article: any) {
  try {
    const rendered = await renderPrompt(article.site_id, "featured_image", {
      title: article.title,
      keyword: article.keywords?.keyword ?? "",
      category: article.categories?.name ?? "",
      cluster: article.topic_clusters?.name ?? "",
      meta_description: article.meta_description ?? "",
    });

    return rendered.text;
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "";

    if (!message.includes("Active prompt not found")) {
      throw error;
    }

    return [
      "Create a realistic, human-feeling editorial photograph for a WordPress article.",
      "Style: believable magazine photography with natural light, real-world textures, subtle imperfections, and a specific scene. Avoid illustration, generic stock-photo sameness, synthetic faces, and repeated desk/laptop setups.",
      `Article title: ${article.title}`,
      `Primary keyword: ${article.keywords?.keyword ?? ""}`,
      `Category: ${article.categories?.name ?? ""}`,
      `Summary: ${article.meta_description ?? ""}`,
    ].join("\n");
  }
}

async function markPreviousFeaturedImagesSuperseded(articleId: string) {
  await db.query(
    `
    UPDATE images
    SET status = 'rejected'
    WHERE article_id = ?
      AND type = 'featured'
      AND status IN ('generated', 'uploaded', 'approved')
    `,
    [articleId]
  );
}

async function getPreviousFeaturedImageMediaIds(articleId: string) {
  const [rows]: any = await db.query(
    `
    SELECT DISTINCT wordpress_media_id
    FROM images
    WHERE article_id = ?
      AND type = 'featured'
      AND wordpress_media_id IS NOT NULL
    `,
    [articleId]
  );

  return rows
    .map((row: any) => Number(row.wordpress_media_id))
    .filter((mediaId: number) => Number.isFinite(mediaId));
}

export async function deleteReplacedWordPressMedia(input: {
  mediaIds: number[];
  keepMediaId: number;
}) {
  const uniqueMediaIds = Array.from(new Set(input.mediaIds))
    .filter((mediaId) => mediaId !== input.keepMediaId);
  const deletedMediaIds: number[] = [];
  const errors: string[] = [];

  for (const mediaId of uniqueMediaIds) {
    try {
      await deleteWordPressMedia(mediaId);
      deletedMediaIds.push(mediaId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      errors.push(`WP media ${mediaId}: ${message}`);
    }
  }

  return {
    deletedMediaIds,
    errors,
  };
}

function addRealisticImageDirection(prompt: string, article: any) {
  const variation = buildPhotoVariation(article);

  return [
    prompt,
    "",
    "Rendering direction:",
    "Use realistic editorial photography rather than cartoon, 3D render, vector art, flat illustration, poster art, glossy stock imagery, or surreal imagery.",
    "Make the scene plausible and useful as a WordPress featured image, with natural light, realistic materials, accurate proportions, and no visible text.",
    "If people appear, make them look candid and natural: believable posture, realistic hands, normal skin texture, imperfect expressions, and no staged advertising smiles.",
    "Do not reuse the same visual formula for every article. Avoid defaulting to the same laptop, notebook, flat lay, or generic office scene unless the topic specifically calls for it.",
    `Use this variation brief for this article: ${variation}`,
  ].join("\n");
}

function buildPhotoVariation(article: any) {
  const variations = [
    "documentary-style scene, eye-level camera, natural window light, grounded everyday setting, restrained colors",
    "environmental portrait style, subject slightly off-center, shallow depth of field, warm practical light, authentic background details",
    "over-the-shoulder action moment, natural motion, imperfect lived-in workspace or location, soft contrast, realistic textures",
    "wide editorial scene, strong sense of place, natural daylight, layered foreground and background, no staged stock poses",
    "close observational detail, hands or objects in use where relevant, tactile materials, ambient light, minimal styling",
    "travel-magazine realism, candid moment, location-specific atmosphere, natural color grading, believable weather and light",
    "quiet reportage style, asymmetrical composition, real people or objects behaving naturally, neutral lens perspective",
    "practical how-to scene, real-world tools or context, natural messiness, clear subject, no perfect showroom styling",
  ];
  const source = [
    article.id,
    article.title,
    article.keywords?.keyword,
    article.categories?.name,
  ].join("|");
  const index = Math.abs(hashString(source)) % variations.length;

  return variations[index];
}

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return hash;
}

async function generateImageBuffer(prompt: string) {
  const openai = getOpenAIClient();
  const config = getImageGenerationConfig();

  const response = await openai.images.generate({
    model: config.model,
    prompt,
    n: 1,
    size: config.size,
    quality: config.quality,
    output_format: config.outputFormat,
    ...(config.outputCompression !== null
      ? { output_compression: config.outputCompression }
      : {}),
  });

  const image = response.data?.[0];
  const aiUsage = buildImageAiUsage({
    model: config.model,
    size: config.size,
    quality: config.quality,
    outputFormat: config.outputFormat,
    outputCompression: config.outputCompression,
  });

  if (image?.b64_json) {
    return {
      imageBuffer: Buffer.from(image.b64_json, "base64"),
      outputFormat: config.outputFormat,
      aiUsage,
    };
  }

  if (image?.url) {
    const download = await fetch(image.url);

    if (!download.ok) {
      throw new Error(
        `Unable to download generated image: ${download.status}`
      );
    }

    return {
      imageBuffer: Buffer.from(await download.arrayBuffer()),
      outputFormat: config.outputFormat,
      aiUsage,
    };
  }

  throw new Error("OpenAI did not return image data.");
}

function getImageGenerationConfig() {
  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
  const size = normalizeImageSize(
    process.env.OPENAI_IMAGE_SIZE || "1536x1024"
  );
  const quality = normalizeImageQuality(
    process.env.OPENAI_IMAGE_QUALITY || "medium"
  );
  const outputFormat = normalizeImageOutputFormat(
    process.env.OPENAI_IMAGE_OUTPUT_FORMAT || "webp"
  );
  const outputCompression =
    outputFormat === "png"
      ? null
      : normalizeImageCompression(
          process.env.OPENAI_IMAGE_OUTPUT_COMPRESSION
        );

  return {
    model,
    size,
    quality,
    outputFormat,
    outputCompression,
  };
}

function normalizeImageQuality(value: string) {
  const supported = ["low", "medium", "high", "auto"] as const;

  return supported.includes(value as (typeof supported)[number])
    ? (value as OpenAIImageQuality)
    : "medium";
}

function normalizeImageSize(value: string) {
  const supported = [
    "1024x1024",
    "1536x1024",
    "1024x1536",
    "auto",
  ] as const;

  return supported.includes(value as (typeof supported)[number])
    ? (value as OpenAIImageSize)
    : "1536x1024";
}

function normalizeImageOutputFormat(value: string) {
  const supported = ["webp", "jpeg", "png"] as const;

  return supported.includes(value as (typeof supported)[number])
    ? (value as OpenAIImageOutputFormat)
    : "webp";
}

function normalizeImageCompression(value: string | undefined) {
  const parsed = Number(value ?? 75);

  if (!Number.isFinite(parsed)) {
    return 75;
  }

  return Math.max(0, Math.min(100, Math.round(parsed)));
}

async function saveGeneratedImageFile(input: {
  imageId: string;
  imageBuffer: Buffer;
  outputFormat: "webp" | "jpeg" | "png";
}) {
  const outputDirectory = path.join(
    process.cwd(),
    "public",
    "generated-images"
  );

  await mkdir(outputDirectory, {
    recursive: true,
  });

  const filename = `${input.imageId}.${extensionForImageFormat(
    input.outputFormat
  )}`;
  const outputPath = path.join(outputDirectory, filename);

  await writeFile(outputPath, input.imageBuffer);

  return `/generated-images/${filename}`;
}

async function uploadImageToWordPress(input: {
  imageBuffer: Buffer;
  filename: string;
  contentType: string;
  title: string;
  altText: string;
}) {
  const wp = getWordPressConfig();

  const response = await fetch(`${wp.url}/wp-json/wp/v2/media`, {
    method: "POST",
    headers: {
      Authorization: getWordPressAuthHeader(),
      "Content-Disposition": `attachment; filename="${sanitizeFilename(
        input.filename
      )}"`,
      "Content-Type": input.contentType,
    },
    body: new Uint8Array(input.imageBuffer),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `WordPress media error: ${response.status} ${errorText}`
    );
  }

  const media = await response.json();

  await updateWordPressMediaAltText({
    mediaId: media.id,
    title: input.title,
    altText: input.altText,
  });

  return Number(media.id);
}

async function updateWordPressMediaAltText(input: {
  mediaId: number;
  title: string;
  altText: string;
}) {
  const wp = getWordPressConfig();

  const response = await fetch(
    `${wp.url}/wp-json/wp/v2/media/${input.mediaId}`,
    {
      method: "POST",
      headers: {
        Authorization: getWordPressAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: input.title,
        alt_text: input.altText,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `WordPress media metadata error: ${response.status} ${errorText}`
    );
  }
}

async function deleteWordPressMedia(mediaId: number) {
  const wp = getWordPressConfig();

  const response = await fetch(
    `${wp.url}/wp-json/wp/v2/media/${mediaId}?force=true`,
    {
      method: "DELETE",
      headers: {
        Authorization: getWordPressAuthHeader(),
      },
    }
  );

  if (!response.ok && response.status !== 404 && response.status !== 410) {
    const errorText = await response.text();
    throw new Error(
      `WordPress media delete error: ${response.status} ${errorText}`
    );
  }
}

async function setWordPressPostFeaturedMedia(input: {
  wordpressPostId: number;
  wordpressMediaId: number;
}) {
  const wp = getWordPressConfig();

  const response = await fetch(
    `${wp.url}/wp-json/wp/v2/posts/${input.wordpressPostId}`,
    {
      method: "POST",
      headers: {
        Authorization: getWordPressAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        featured_media: input.wordpressMediaId,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `WordPress featured media error: ${response.status} ${errorText}`
    );
  }
}

function buildAltText(article: any) {
  const keyword = article.keywords?.keyword;

  return keyword
    ? `${article.title} - ${keyword}`
    : article.title;
}

function sanitizeFilename(filename: string) {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-");
}

function extensionForImageFormat(format: "webp" | "jpeg" | "png") {
  return format === "jpeg" ? "jpg" : format;
}

function contentTypeForImageFormat(format: "webp" | "jpeg" | "png") {
  if (format === "jpeg") {
    return "image/jpeg";
  }

  return `image/${format}`;
}
