import {
  getWordPressAuthHeader,
  getWordPressConfig,
} from "@/lib/wordpress";
import {
  getApprovedArticleForPublishing,
  markArticlePublished,
} from "@/modules/editorial/repository";

export async function publishApprovedArticle(
  articleId: string
) {
  const article =
    await getApprovedArticleForPublishing(articleId);

  if (!article) {
    throw new Error(
      "Approved article was not found."
    );
  }

  if (!article.wordpress_post_id) {
    throw new Error(
      "This article does not have a WordPress post ID."
    );
  }

  const wordpress = getWordPressConfig();

  const response = await fetch(
    `${wordpress.url}/wp-json/wp/v2/posts/${article.wordpress_post_id}`,
    {
      method: "POST",
      headers: {
        Authorization: getWordPressAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "publish",
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `WordPress publishing failed: ${response.status} ${errorText}`
    );
  }

  const result = await response.json();

  if (!result.link) {
    throw new Error(
      "WordPress did not return the published post URL."
    );
  }

  await markArticlePublished(
    article.id,
    result.link
  );

  return {
    articleId: article.id,
    wordpressPostId: result.id,
    publishedUrl: result.link,
  };
}