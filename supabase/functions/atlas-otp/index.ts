import "@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};

const SUPABASE_URL =
  Deno.env.get("SUPABASE_URL")!;

const SUPABASE_ANON_KEY =
  Deno.env.get("SUPABASE_ANON_KEY")!;

const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;


// ============================================================
// Base32
// ============================================================

const BASE32_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";


function base32Encode(bytes: Uint8Array): string {

  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of bytes) {

    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {

      output +=
        BASE32_ALPHABET[
          (value >>> (bits - 5)) & 31
        ];

      bits -= 5;
    }
  }

  if (bits > 0) {

    output +=
      BASE32_ALPHABET[
        (value << (5 - bits)) & 31
      ];
  }

  return output;
}


function base32Decode(input: string): Uint8Array {

  const clean =
    input
      .replace(/=+$/g, "")
      .toUpperCase()
      .replace(/\s/g, "");

  const output: number[] = [];

  let bits = 0;
  let value = 0;

  for (const char of clean) {

    const index =
      BASE32_ALPHABET.indexOf(char);

    if (index === -1) {
      throw new Error("Invalid Base32 secret");
    }

    value =
      (value << 5) | index;

    bits += 5;

    if (bits >= 8) {

      output.push(
        (value >>> (bits - 8)) & 255
      );

      bits -= 8;
    }
  }

  return new Uint8Array(output);
}


// ============================================================
// 產生 Secret
// ============================================================

function generateSecret(): string {

  const bytes =
    crypto.getRandomValues(
      new Uint8Array(20)
    );

  return base32Encode(bytes);
}


// ============================================================
// TOTP
// ============================================================

async function generateTotp(
  secret: string,
  counter: number,
): Promise<string> {

  const secretBytes =
    base32Decode(secret);

  const counterBytes =
    new Uint8Array(8);

  let temp = counter;

  for (let i = 7; i >= 0; i--) {

    counterBytes[i] =
      temp & 0xff;

    temp =
      Math.floor(temp / 256);
  }

  const key =
    await crypto.subtle.importKey(
      "raw",
      secretBytes,
      {
        name: "HMAC",
        hash: "SHA-1",
      },
      false,
      ["sign"],
    );

  const hash =
    new Uint8Array(
      await crypto.subtle.sign(
        "HMAC",
        key,
        counterBytes,
      )
    );

  const offset =
    hash[hash.length - 1] & 0x0f;

  const binary =
    (
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff)
    ) >>> 0;

  const otp =
    binary % 1_000_000;

  return otp
    .toString()
    .padStart(6, "0");
}


// ============================================================
// 驗證 TOTP
// ============================================================

async function verifyTotp(
  secret: string,
  code: string,
): Promise<boolean> {

  if (!/^\d{6}$/.test(code)) {
    return false;
  }

  const currentCounter =
    Math.floor(
      Date.now() / 1000 / 30
    );

  // 容許前後一個 30 秒
  // 避免手機與伺服器時間有些微誤差

  for (const offset of [-1, 0, 1]) {

    const expected =
      await generateTotp(
        secret,
        currentCounter + offset,
      );

    if (expected === code) {
      return true;
    }
  }

  return false;
}


// ============================================================
// Response
// ============================================================

function json(
  body: unknown,
  status = 200,
) {

  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type":
          "application/json",
      },
    },
  );
}


// ============================================================
// Main
// ============================================================

Deno.serve(async (req) => {

  // ----------------------------------------------------------
  // CORS
  // ----------------------------------------------------------

  if (req.method === "OPTIONS") {

    return new Response(
      "ok",
      {
        headers: corsHeaders,
      },
    );
  }


  if (req.method !== "POST") {

    return json(
      {
        success: false,
        message: "Method not allowed",
      },
      405,
    );
  }


  try {

    // --------------------------------------------------------
    // 取得登入使用者
    // --------------------------------------------------------

    const authorization =
      req.headers.get(
        "Authorization"
      );

    if (!authorization) {

      return json(
        {
          success: false,
          message: "未登入",
        },
        401,
      );
    }


    const accessToken =
      authorization.replace(
        "Bearer ",
        "",
      );


    // 用一般 Supabase client
    // 驗證目前登入的 User

    const supabaseAuth =
      createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        {
          global: {
            headers: {
              Authorization:
                `Bearer ${accessToken}`,
            },
          },
        },
      );


    const {
      data: {
        user,
      },
      error: userError,
    } =
      await supabaseAuth.auth.getUser();


    if (
      userError ||
      !user
    ) {

      return json(
        {
          success: false,
          message: "登入狀態無效",
        },
        401,
      );
    }


    // --------------------------------------------------------
    // Admin Client
    // --------------------------------------------------------

    const supabaseAdmin =
      createClient(
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        },
      );


    // --------------------------------------------------------
    // 取得前端要求
    // --------------------------------------------------------

    const body =
      await req.json();

    const action =
      body?.action;


    // ========================================================
    // SETUP
    // ========================================================

    if (action === "setup") {

      const secret =
        generateSecret();


      const email =
        user.email ??
        user.id;


      const issuer =
        "Atlas OS";


      const label =
        `${issuer}:${email}`;


      const otpauthUri =
        `otpauth://totp/${encodeURIComponent(label)}` +
        `?secret=${secret}` +
        `&issuer=${encodeURIComponent(issuer)}` +
        `&algorithm=SHA1` +
        `&digits=6` +
        `&period=30`;


      // ------------------------------------------------------
      // 寫入 atlas_otp
      // ------------------------------------------------------

      const {
        error: upsertError,
      } =
        await supabaseAdmin
          .from("atlas_otp")
          .upsert(
            {
              user_id: user.id,
              secret,
              enabled: false,
            },
            {
              onConflict:
                "user_id",
            },
          );


      if (upsertError) {

        console.error(
          upsertError,
        );

        return json(
          {
            success: false,
            message:
              "OTP 設定儲存失敗",
          },
          500,
        );
      }


      return json({
        success: true,

        message:
          "OTP 設定建立成功",

        // Secure SignIn App
        // 掃描這個 URI 對應的 QR Code
        otpauthUri,

        // 提供前端必要資訊
        issuer,
        account: email,
      });
    }


    // ========================================================
    // VERIFY
    // ========================================================

    if (action === "verify") {

      const code =
        String(
          body?.code ?? ""
        ).trim();


      if (!/^\d{6}$/.test(code)) {

        return json(
          {
            success: false,
            message:
              "OTP 必須是 6 位數字",
          },
          400,
        );
      }


      // ------------------------------------------------------
      // 取得使用者 OTP Secret
      // ------------------------------------------------------

      const {
        data: otpRecord,
        error: otpError,
      } =
        await supabaseAdmin
          .from("atlas_otp")
          .select(
            "secret, enabled"
          )
          .eq(
            "user_id",
            user.id
          )
          .maybeSingle();


      if (otpError) {

        console.error(
          otpError,
        );

        return json(
          {
            success: false,
            message:
              "讀取 OTP 設定失敗",
          },
          500,
        );
      }


      if (!otpRecord) {

        return json(
          {
            success: false,
            message:
              "尚未建立 OTP",
          },
          400,
        );
      }


      // ------------------------------------------------------
      // 驗證 OTP
      // ------------------------------------------------------

      const valid =
        await verifyTotp(
          otpRecord.secret,
          code,
        );


      if (!valid) {

        return json(
          {
            success: false,
            message:
              "OTP 驗證失敗",
          },
          401,
        );
      }


      // ------------------------------------------------------
      // 第一次驗證成功
      // → 啟用 OTP
      // ------------------------------------------------------

      if (!otpRecord.enabled) {

        const {
          error: enableError,
        } =
          await supabaseAdmin
            .from("atlas_otp")
            .update({
              enabled: true,
            })
            .eq(
              "user_id",
              user.id
            );


        if (enableError) {

          console.error(
            enableError,
          );

          return json(
            {
              success: false,
              message:
                "OTP 啟用失敗",
            },
            500,
          );
        }
      }


      return json({
        success: true,
        verified: true,
        message:
          "OTP 驗證成功",
      });
    }


    // ========================================================
    // CHECK
    // ========================================================

    if (action === "check") {

      const {
        data: otpRecord,
        error: otpError,
      } =
        await supabaseAdmin
          .from("atlas_otp")
          .select(
            "enabled"
          )
          .eq(
            "user_id",
            user.id
          )
          .maybeSingle();


      if (otpError) {

        console.error(
          otpError,
        );

        return json(
          {
            success: false,
            message:
              "無法取得 OTP 狀態",
          },
          500,
        );
      }


      return json({
        success: true,

        enabled:
          otpRecord?.enabled === true,
      });
    }


    // ========================================================
    // RESET
    // ========================================================

    if (action === "reset") {

      const {
        error: deleteError,
      } =
        await supabaseAdmin
          .from("atlas_otp")
          .delete()
          .eq(
            "user_id",
            user.id
          );


      if (deleteError) {

        console.error(
          deleteError,
        );

        return json(
          {
            success: false,
            message:
              "OTP 重設失敗",
          },
          500,
        );
      }


      return json({
        success: true,
        message:
          "OTP 已重設",
      });
    }


    // --------------------------------------------------------
    // 未知 action
    // --------------------------------------------------------

    return json(
      {
        success: false,
        message:
          "未知的 action",
      },
      400,
    );

  } catch (error) {

    console.error(
      error,
    );

    return json(
      {
        success: false,
        message:
          "OTP Function 發生錯誤",
      },
      500,
    );
  }
});