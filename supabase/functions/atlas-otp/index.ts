// @ts-nocheck
import "@supabase/functions-js/edge-runtime.d.ts";

const runtime = globalThis as typeof globalThis & {
  Deno: {
    env: {
      get(name: string): string | undefined;
    };
  };
};

const SUPABASE_URL =
  runtime.Deno.env.get("SUPABASE_URL") ?? "";

const SUPABASE_SERVICE_ROLE_KEY =
  runtime.Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
  "Content-Type":
    "application/json; charset=utf-8",
};

function json(
  data: unknown,
  status = 200,
) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: corsHeaders,
    },
  );
}

/* =========================================================
   Base32
   ========================================================= */

const BASE32_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(
  bytes: Uint8Array,
): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of bytes) {
    value =
      (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output +=
        BASE32_CHARS[
          (value >> (bits - 5)) & 31
        ];

      bits -= 5;
    }
  }

  if (bits > 0) {
    output +=
      BASE32_CHARS[
        (value << (5 - bits)) & 31
      ];
  }

  return output;
}

function base32Decode(
  input: string,
): Uint8Array {
  const clean =
    input
      .toUpperCase()
      .replace(/[^A-Z2-7]/g, "");

  let bits = 0;
  let value = 0;

  const output: number[] = [];

  for (const char of clean) {
    const index =
      BASE32_CHARS.indexOf(char);

    if (index === -1) {
      continue;
    }

    value =
      (value << 5) | index;

    bits += 5;

    if (bits >= 8) {
      output.push(
        (value >> (bits - 8)) & 255,
      );

      bits -= 8;
    }
  }

  return new Uint8Array(output);
}

/* =========================================================
   Secure random secret
   ========================================================= */

function generateSecret(): string {
  const bytes =
    new Uint8Array(20);

  crypto.getRandomValues(bytes);

  return base32Encode(bytes);
}

/* =========================================================
   TOTP
   RFC 6238 / SHA-1 / 30 seconds
   ========================================================= */

async function generateTotp(
  secret: string,
  timestamp = Date.now(),
): Promise<string> {
  const secretBytes =
    base32Decode(secret);

  const counter =
    BigInt(
      Math.floor(
        timestamp / 1000 / 30,
      ),
    );

  const counterBytes =
    new Uint8Array(8);

  let temp = counter;

  for (let i = 7; i >= 0; i--) {
    counterBytes[i] =
      Number(temp & 0xffn);

    temp >>= 8n;
  }

  const key =
    await crypto.subtle.importKey(
      "raw",
      secretBytes.buffer as ArrayBuffer,
      {
        name: "HMAC",
        hash: "SHA-1",
      },
      false,
      ["sign"],
    );

  const signature =
    await crypto.subtle.sign(
      "HMAC",
      key,
      counterBytes.buffer as ArrayBuffer,
    );

  const hash =
    new Uint8Array(signature);

  const offset =
    hash[hash.length - 1] & 0x0f;

  const binary =
    (
      ((hash[offset] & 0x7f) << 24) |
      (hash[offset + 1] << 16) |
      (hash[offset + 2] << 8) |
      hash[offset + 3]
    ) >>> 0;

  const otp =
    binary % 1_000_000;

  return otp
    .toString()
    .padStart(6, "0");
}

/* =========================================================
   Verify TOTP
   Allow ±1 time window
   ========================================================= */

async function verifyTotp(
  secret: string,
  code: string,
): Promise<boolean> {
  const cleanCode =
    code.replace(/\D/g, "");

  if (cleanCode.length !== 6) {
    return false;
  }

  const now =
    Date.now();

  const windows = [
    -1,
    0,
    1,
  ];

  for (const offset of windows) {
    const expected =
      await generateTotp(
        secret,
        now + offset * 30_000,
      );

    if (
      expected ===
      cleanCode
    ) {
      return true;
    }
  }

  return false;
}

/* =========================================================
   Get authenticated Supabase user
   ========================================================= */

async function getUser(
  request: Request,
) {
  const authHeader =
    request.headers.get(
      "Authorization",
    );

  if (
    !authHeader ||
    !authHeader.startsWith(
      "Bearer ",
    )
  ) {
    return null;
  }

  const accessToken =
    authHeader.substring(7);

  const response =
    await fetch(
      `${SUPABASE_URL}/auth/v1/user`,
      {
        method: "GET",
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
          apikey:
            SUPABASE_SERVICE_ROLE_KEY,
        },
      },
    );

  if (!response.ok) {
    return null;
  }

  return await response.json();
}

/* =========================================================
   Database helpers
   ========================================================= */

async function getOtpRecord(
  userId: string,
) {
  const url =
    `${SUPABASE_URL}/rest/v1/atlas_otp` +
    `?user_id=eq.${encodeURIComponent(userId)}` +
    `&select=user_id,secret,enabled` +
    `&limit=1`;

  const response =
    await fetch(url, {
      method: "GET",
      headers: {
        apikey:
          SUPABASE_SERVICE_ROLE_KEY,
        Authorization:
          `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });

  if (!response.ok) {
    throw new Error(
      "讀取 OTP 設定失敗",
    );
  }

  const rows =
    await response.json();

  return rows.length > 0
    ? rows[0]
    : null;
}

async function saveOtpRecord(
  userId: string,
  secret: string,
  enabled: boolean,
) {
  const response =
    await fetch(
      `${SUPABASE_URL}/rest/v1/atlas_otp`,
      {
        method: "POST",
        headers: {
          apikey:
            SUPABASE_SERVICE_ROLE_KEY,
          Authorization:
            `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type":
            "application/json",
          Prefer:
            "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify({
          user_id: userId,
          secret,
          enabled,
        }),
      },
    );

  if (!response.ok) {
    const text =
      await response.text();

    throw new Error(
      `儲存 OTP 設定失敗：${text}`,
    );
  }

  return await response.json();
}

async function updateOtpEnabled(
  userId: string,
  enabled: boolean,
) {
  const url =
    `${SUPABASE_URL}/rest/v1/atlas_otp` +
    `?user_id=eq.${encodeURIComponent(userId)}`;

  const response =
    await fetch(url, {
      method: "PATCH",
      headers: {
        apikey:
          SUPABASE_SERVICE_ROLE_KEY,
        Authorization:
          `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        enabled,
      }),
    });

  if (!response.ok) {
    const text =
      await response.text();

    throw new Error(
      `更新 OTP 狀態失敗：${text}`,
    );
  }
}

/* =========================================================
   Main Function
   ========================================================= */

Deno.serve(
  async (request: Request) => {
    try {
      /* -----------------------------------------
         CORS
      ----------------------------------------- */

      if (
        request.method ===
        "OPTIONS"
      ) {
        return new Response(
          "ok",
          {
            headers:
              corsHeaders,
          },
        );
      }

      if (
        request.method !==
        "POST"
      ) {
        return json(
          {
            error:
              "只接受 POST",
          },
          405,
        );
      }

      /* -----------------------------------------
         Environment
      ----------------------------------------- */

      if (
        !SUPABASE_URL ||
        !SUPABASE_SERVICE_ROLE_KEY
      ) {
        return json(
          {
            error:
              "Supabase Function 環境變數未設定",
          },
          500,
        );
      }

      /* -----------------------------------------
         Authentication
      ----------------------------------------- */

      const user =
        await getUser(request);

      if (!user?.id) {
        return json(
          {
            error:
              "未登入或登入已過期",
          },
          401,
        );
      }

      const userId =
        user.id;

      /* -----------------------------------------
         Request body
      ----------------------------------------- */

      const body =
        await request.json();

      const action =
        body?.action;

      /* =================================================
         SETUP
         建立新的 Atlas OTP
      ================================================= */

      if (
        action ===
        "setup"
      ) {
        const existing =
          await getOtpRecord(
            userId,
          );

        /*
         * 如果已經有啟用中的 OTP，
         * 不重新產生 Secret。
         */
        if (
          existing &&
          existing.enabled
        ) {
          return json({
            success: true,
            enabled: true,
            alreadySetup:
              true,
          });
        }

        const secret =
          generateSecret();

        await saveOtpRecord(
          userId,
          secret,
          false,
        );

        const issuer =
          "Atlas OS";

        const account =
          user.email ??
          userId;

        const otpauth =
          `otpauth://totp/` +
          `${encodeURIComponent(
            issuer,
          )}:${encodeURIComponent(
            account,
          )}` +
          `?secret=${secret}` +
          `&issuer=${encodeURIComponent(
            issuer,
          )}` +
          `&algorithm=SHA1` +
          `&digits=6` +
          `&period=30`;

        return json({
          success: true,
          enabled: false,
          secret,
          otpauth,
        });
      }

      /* =================================================
         VERIFY
         驗證 Authenticator 的 6 位數 OTP
      ================================================= */

      if (
        action ===
        "verify"
      ) {
        const code =
          String(
            body?.code ??
              "",
          );

        const record =
          await getOtpRecord(
            userId,
          );

        if (!record) {
          return json(
            {
              success: false,
              error:
                "尚未建立 OTP",
            },
            400,
          );
        }

        const valid =
          await verifyTotp(
            record.secret,
            code,
          );

        if (!valid) {
          return json({
            success: false,
            verified: false,
            error:
              "驗證碼錯誤或已過期",
          });
        }

        await updateOtpEnabled(
          userId,
          true,
        );

        return json({
          success: true,
          verified: true,
          enabled: true,
        });
      }

      /* =================================================
         STATUS
         查詢目前是否已啟用 OTP
      ================================================= */

      if (
        action ===
        "status"
      ) {
        const record =
          await getOtpRecord(
            userId,
          );

        return json({
          success: true,
          enabled:
            record?.enabled ===
            true,
          configured:
            !!record,
        });
      }

      /* =================================================
         DISABLE
         關閉 Atlas OTP
      ================================================= */

      if (
        action ===
        "disable"
      ) {
        const record =
          await getOtpRecord(
            userId,
          );

        if (!record) {
          return json({
            success: true,
            enabled: false,
          });
        }

        await updateOtpEnabled(
          userId,
          false,
        );

        return json({
          success: true,
          enabled: false,
        });
      }

      return json(
        {
          success: false,
          error:
            "未知的 action",
        },
        400,
      );
    } catch (error) {
      console.error(
        "atlas-otp error:",
        error,
      );

      return json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "伺服器發生錯誤",
        },
        500,
      );
    }
  },
);