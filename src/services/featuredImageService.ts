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
import { renderPrompt } from "@/services/promptService";

type FeaturedImageResult = {
  imageId: string;
  fileUrl: string;
  wordpressMediaId: number;
  altText: string;
};

export async function generateAndUploadFeaturedImage(
  articleId: string
): Promise<FeaturedImageResult> {
  const article: any = await getArticleById(articleId);

  if (!article) {
    throw new Error("Article not found.");
  }

  const prompt = addRealisticImageDirection(
    await buildFeaturedImagePrompt(article)
  );
  const altText = buildAltText(article);
  const imageId = randomUUID();

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

  const imageBuffer = await generateImageBuffer(prompt);
  const fileUrl = await saveGeneratedImageFile(imageId, imageBuffer);

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
    filename: `${article.slug || imageId}-featured.png`,
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
    altText,
  };
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

  return image;
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
      "Create a realistic editorial featured image for a WordPress article.",
      "Style: natural photographic realism, professional magazine photography, believable lighting, real-world textures, clean composition, no text, no logos, no watermarks.",
      `Article title: ${article.title}`,
      `Primary keyword: ${article.keywords?.keyword ?? ""}`,
      `Category: ${article.categories?.name ?? ""}`,
      `Summary: ${article.meta_description ?? ""}`,
    ].join("\n");
  }
}

function addRealisticImageDirection(prompt: string) {
  return [
    prompt,
    "",
    "Rendering direction:",
    "Use realistic editorial photography rather than cartoon, 3D render, vector art, flat illustration, poster art, or surreal imagery.",
    "Make the scene plausible and useful as a WordPress featured image, with natural light, realistic materials, accurate proportions, and no visible text.",
  ].join("\n");
}

async function generateImageBuffer(prompt: string) {
  const openai = getOpenAIClient();

  const response = await openai.images.generate({
    model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
    prompt,
    n: 1,
    size: "1536x1024",
    quality: "high",
    output_format: "png",
  });

  const image = response.data?.[0];

  if (image?.b64_json) {
    return Buffer.from(image.b64_json, "base64");
  }

  if (image?.url) {
    const download = await fetch(image.url);

    if (!download.ok) {
      throw new Error(
        `Unable to download generated image: ${download.status}`
      );
    }

    return Buffer.from(await download.arrayBuffer());
  }

  throw new Error("OpenAI did not return image data.");
}

async function saveGeneratedImageFile(
  imageId: string,
  imageBuffer: Buffer
) {
  const outputDirectory = path.join(
    process.cwd(),
    "public",
    "generated-images"
  );

  await mkdir(outputDirectory, {
    recursive: true,
  });

  const filename = `${imageId}.png`;
  const outputPath = path.join(outputDirectory, filename);

  await writeFile(outputPath, imageBuffer);

  return `/generated-images/${filename}`;
}

async function uploadImageToWordPress(input: {
  imageBuffer: Buffer;
  filename: string;
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
      "Content-Type": "image/png",
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
