import type {
  VercelRequest,
  VercelResponse,
} from "@vercel/node";

const TWSE_API =
  "https://mis.twse.com.tw/stock/api/getStockInfo.jsp";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // =====================================================
  // CORS
  // =====================================================

  res.setHeader(
    "Access-Control-Allow-Origin",
    "*"
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // =====================================================
  // 只接受 GET
  // =====================================================

  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method Not Allowed",
    });
  }

  // =====================================================
  // 取得 ex_ch
  //
  // 例如：
  //
  // tse_0050.tw|tse_4916.tw|tse_00992A.tw
  // =====================================================

  const exCh: string =
    typeof req.query.ex_ch === "string"
      ? req.query.ex_ch
      : "";

  if (!exCh) {
    return res.status(400).json({
      error: "缺少 ex_ch 參數。",
    });
  }

  // =====================================================
  // 基本格式檢查
  // =====================================================

  const symbols: string[] =
    exCh.split("|");

  const validSymbols =
    symbols.every(
      (symbol: string) =>
        /^(tse|otc)_[A-Za-z0-9-]+\.tw$/.test(
          symbol
        )
    );

  if (!validSymbols) {
    return res.status(400).json({
      error: "ex_ch 參數格式不正確。",
    });
  }

  // =====================================================
  // 組合 TWSE API
  // =====================================================

  const url = new URL(TWSE_API);

  url.searchParams.set(
    "ex_ch",
    exCh
  );

  url.searchParams.set(
    "json",
    "1"
  );

  url.searchParams.set(
    "delay",
    "0"
  );

  // =====================================================
  // 避免快取
  // =====================================================

  url.searchParams.set(
    "_",
    Date.now().toString()
  );

  try {
    // ===================================================
    // 呼叫 TWSE
    // ===================================================

    const response =
      await fetch(
        url.toString(),
        {
          method: "GET",
          headers: {
            Accept:
              "application/json",
            "User-Agent":
              "Mozilla/5.0",
          },
        }
      );

    // ===================================================
    // TWSE HTTP 錯誤
    // ===================================================

    if (!response.ok) {
      console.error(
        "TWSE API HTTP error:",
        response.status,
        response.statusText
      );

      return res
        .status(502)
        .json({
          error:
            `TWSE 行情服務錯誤：${response.status}`,
        });
    }

    // ===================================================
    // 解析 JSON
    // ===================================================

    const data =
      await response.json();

    // ===================================================
    // 確認 TWSE 有回傳行情
    // ===================================================

    if (
      !data ||
      !Array.isArray(
        data.msgArray
      )
    ) {
      console.error(
        "TWSE unexpected response:",
        data
      );

      return res
        .status(502)
        .json({
          error:
            "TWSE 沒有回傳有效的行情資料。",
        });
    }

    // ===================================================
    // 原樣回傳 TWSE msgArray
    //
    // StockCenter.tsx 自己負責：
    //
    // z = 最新成交價
    // y = 前一交易日收盤價
    // d = 日期
    // t = 時間
    //
    // 不碰你的損益與報酬率計算。
    // ===================================================

    return res.status(200).json({
      msgArray:
        data.msgArray,
    });
  } catch (error) {
    console.error(
      "TWSE proxy exception:",
      error
    );

    return res.status(500).json({
      error:
        "取得 TWSE 股票行情時發生錯誤。",
    });
  }
}