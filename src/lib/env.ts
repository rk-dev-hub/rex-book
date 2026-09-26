import "server-only";

import { z } from "zod";

const envSchema = z.object({
  REXCARTE_API_URL: z.url(),
  SESSION_COOKIE_SECURE: z.stringbool().default(true),
  APP_URL: z.url(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/**
 * サーバー専用の環境変数を検証して返す。
 * ビルド時に値が埋め込まれないよう、import 時ではなく呼び出し時（リクエスト時）に読む。
 */
export function getEnv(): Env {
  if (!cached) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      throw new Error(`環境変数が不正です: ${z.prettifyError(result.error)}`);
    }
    cached = result.data;
  }
  return cached;
}
