import { timingSafeEqual } from "node:crypto";

export function assertAutomationRequest(request: Request) {
  const expectedSecret = process.env.AUTOMATION_SECRET;

  if (!expectedSecret) {
    throw new Error("AUTOMATION_SECRET is not configured.");
  }

  const authorization = request.headers.get("authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();

  if (!token || !safeEqual(token, expectedSecret)) {
    throw new Error("Unauthorized automation request.");
  }
}

function safeEqual(value: string, expected: string) {
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);

  if (valueBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(valueBuffer, expectedBuffer);
}
