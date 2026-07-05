# RPOS Studio Next.js v0.2

## New in v0.2

- Keyword Library with Generate button
- OpenAI article planning service
- Article Queue page
- Article Detail page
- Repository/service structure

## Setup

1. Copy environment file:

```powershell
copy .env.example .env.local
```

2. Edit `.env.local`:

```text
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=rpos_studio
MYSQL_USER=root
MYSQL_PASSWORD=

OPENAI_API_KEY=your_openai_api_key_here
```

3. Install dependencies:

```powershell
npm install
```

4. Run:

```powershell
npm run dev
```

5. Open:

```text
http://localhost:3000/keywords
```

## How to Test

1. Go to `/keywords`
2. Click `Generate` next to an approved keyword
3. Wait for OpenAI to create the article plan
4. You should be redirected to `/articles/{id}`
5. The keyword status becomes `planned`
6. The article status becomes `outline_ready`

## Important

This version does not publish to WordPress yet. It only creates article plans.
