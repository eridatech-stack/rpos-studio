export function getWordPressConfig() {
  const url = process.env.WORDPRESS_URL;
  const username = process.env.WORDPRESS_USERNAME;
  const appPassword = process.env.WORDPRESS_APP_PASSWORD;

  if (!url || !username || !appPassword) {
    throw new Error("WordPress credentials are missing in .env.local.");
  }

  return {
    url: url.replace(/\/$/, ""),
    username,
    appPassword,
  };
}

export function getWordPressAuthHeader() {
  const { username, appPassword } = getWordPressConfig();
  const token = Buffer.from(`${username}:${appPassword}`).toString("base64");

  return `Basic ${token}`;
}