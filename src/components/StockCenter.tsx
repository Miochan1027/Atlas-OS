import { useEffect, useState } from "react";

type Stock = {
  id: string;
  code: string;
  name: string;
  shares: number;
  cost: number;
  note: string;
};

type StockQuote = {
  price: number | null;
  change: number | null;
  changePercent: number | null;
  updatedAt: string;
};

type StockLog = {
  id: string;
  date: string;
  code: string;
  shares: number;
  price: number;
  fee: number;
};

type TwseQuote = {
  c: string;
  n: string;
  z: string;
  y: string;
  d: string;
  t: string;
};

type TwseResponse = {
  msgArray?: TwseQuote[];
};

const defaultStocks: Stock[] = [
  {
    id: "0050",
    code: "0050",
    name: "元大台灣50",
    shares: 0,
    cost: 0,
    note: "",
  },
  {
    id: "4916",
    code: "4916",
    name: "事欣科",
    shares: 0,
    cost: 0,
    note: "",
  },
  {
    id: "00992A",
    code: "00992A",
    name: "主動式台股ETF",
    shares: 0,
    cost: 0,
    note: "",
  },
  {
    id: "2886",
    code: "2886",
    name: "兆豐金",
    shares: 0,
    cost: 0,
    note: "",
  },
];

function StockCenter() {
  const today = new Date().toLocaleDateString(
    "en-CA"
  );

  const [stocks, setStocks] = useState<Stock[]>(
    () => {
      const saved =
        localStorage.getItem("atlas-stocks");

      if (!saved) {
        return defaultStocks;
      }

      try {
        const parsed = JSON.parse(saved);

        return parsed.map(
          (stock: Stock) => ({
            id: stock.id,
            code: stock.code,
            name: stock.name,
            shares: stock.shares ?? 0,
            cost: stock.cost ?? 0,
            note: stock.note ?? "",
          })
        );
      } catch {
        return defaultStocks;
      }
    }
  );

  const [quotes, setQuotes] =
    useState<Record<string, StockQuote>>({});

  const [isLoading, setIsLoading] =
    useState(false);

  const [quoteError, setQuoteError] =
    useState("");

  const [lastUpdated, setLastUpdated] =
    useState("");

  const [stockLogs, setStockLogs] =
    useState<StockLog[]>(() => {
      const saved =
        localStorage.getItem(
          "atlas-stock-logs"
        );

      if (!saved) {
        return [];
      }

      try {
        return JSON.parse(
          saved
        ) as StockLog[];
      } catch {
        return [];
      }
    });

  const [selectedStock, setSelectedStock] =
    useState("0050");

  const [buyDate, setBuyDate] =
    useState(today);

  const [buyShares, setBuyShares] =
    useState("");

  const [buyPrice, setBuyPrice] =
    useState("");

  const [buyFee, setBuyFee] =
    useState("");

  useEffect(() => {
    localStorage.setItem(
      "atlas-stocks",
      JSON.stringify(stocks)
    );
  }, [stocks]);

  useEffect(() => {
    localStorage.setItem(
      "atlas-stock-logs",
      JSON.stringify(stockLogs)
    );
  }, [stockLogs]);

  /*
   * 取得 TWSE 即時行情
   */
  const fetchQuotes = async () => {
    setIsLoading(true);
    setQuoteError("");

    try {
      const symbols = stocks
        .map(
          (stock) =>
            `tse_${stock.code}.tw`
        )
        .join("|");

      const response = await fetch(
        `/api/twse?ex_ch=${encodeURIComponent(
          symbols
        )}&json=1&delay=0`
      );

      if (!response.ok) {
        throw new Error(
          `行情伺服器錯誤：${response.status}`
        );
      }

      const data =
        (await response.json()) as TwseResponse;

      if (
        !data.msgArray ||
        data.msgArray.length === 0
      ) {
        throw new Error(
          "TWSE 沒有回傳行情資料"
        );
      }

      const quoteMap: Record<
        string,
        StockQuote
      > = {};

      data.msgArray.forEach(
        (item) => {
          /*
           * TWSE 欄位：
           *
           * c = 股票代號
           * n = 股票名稱
           * z = 最新成交價
           * y = 前一交易日收盤價
           * d = 日期
           * t = 時間
           *
           * ⚠️ d 絕對不能拿來當漲跌！
           */

          const currentPrice =
            item.z &&
            item.z !== "-"
              ? Number(item.z)
              : NaN;

          const previousClose =
            item.y &&
            item.y !== "-"
              ? Number(item.y)
              : NaN;

          let price:
            | number
            | null = null;

          /*
           * 有最新成交價：
           * 使用 z
           *
           * 沒有最新成交價：
           * 使用前一交易日收盤價 y
           */
          if (
            Number.isFinite(
              currentPrice
            )
          ) {
            price = currentPrice;
          } else if (
            Number.isFinite(
              previousClose
            )
          ) {
            price = previousClose;
          }

          /*
           * 正確計算今日漲跌
           *
           * 絕對不能使用 item.d
           * 因為 item.d 是日期，例如 20260807
           */
          let change:
            | number
            | null = null;

          if (
            price !== null &&
            Number.isFinite(
              previousClose
            )
          ) {
            change =
              price - previousClose;
          }

          /*
           * 正確計算今日漲跌幅
           */
          let changePercent:
            | number
            | null = null;

          if (
            change !== null &&
            previousClose > 0
          ) {
            changePercent =
              (change /
                previousClose) *
              100;
          }

          quoteMap[item.c] = {
            price,
            change,
            changePercent,
            updatedAt:
              item.t || "",
          };
        }
      );

      setQuotes(quoteMap);

      setLastUpdated(
        new Date().toLocaleTimeString(
          "zh-TW",
          {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }
        )
      );
    } catch (error) {
      console.error(
        "取得股票行情失敗：",
        error
      );

      setQuoteError(
        "目前無法取得最新行情，請稍後再試。"
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();

    const timer =
      window.setInterval(() => {
        fetchQuotes();
      }, 60 * 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  /*
   * 更新股票備註
   */
  const updateStockNote = (
    id: string,
    value: string
  ) => {
    setStocks((current) =>
      current.map((stock) =>
        stock.id === id
          ? {
              ...stock,
              note: value,
            }
          : stock
      )
    );
  };

  /*
   * 新增買入紀錄
   *
   * 新增後：
   * 1. 儲存投資紀錄
   * 2. 自動增加持有股數
   * 3. 自動重新計算平均成本
   *
   * 平均成本會把手續費算進去。
   */
  const addStockLog = () => {
    const shares =
      Number(buyShares);

    const price =
      Number(buyPrice);

    const fee =
      Number(buyFee || 0);

    if (
      !buyDate ||
      !Number.isFinite(shares) ||
      shares <= 0 ||
      !Number.isFinite(price) ||
      price <= 0 ||
      !Number.isFinite(fee) ||
      fee < 0
    ) {
      return;
    }

    const newLog: StockLog = {
      id: Date.now().toString(),
      date: buyDate,
      code: selectedStock,
      shares,
      price,
      fee,
    };

    /*
     * 新增投資紀錄
     */
    setStockLogs((current) => [
      newLog,
      ...current,
    ]);

    /*
     * 同步更新目前持股
     *
     * 舊投入成本：
     * 舊股數 × 舊平均成本
     *
     * 本次投入：
     * 買入股數 × 買入價格 + 手續費
     *
     * 新平均成本：
     * 新總投入成本 ÷ 新總股數
     */
    setStocks((current) =>
      current.map((stock) => {
        if (
          stock.code !==
          selectedStock
        ) {
          return stock;
        }

        const oldShares =
          stock.shares;

        const oldCost =
          oldShares *
          stock.cost;

        const newInvestment =
          shares * price +
          fee;

        const newShares =
          oldShares + shares;

        const newTotalCost =
          oldCost +
          newInvestment;

        const newAverageCost =
          newShares === 0
            ? 0
            : newTotalCost /
              newShares;

        return {
          ...stock,
          shares: newShares,
          cost:
            newAverageCost,
        };
      })
    );

    /*
     * 清空輸入欄位
     */
    setBuyShares("");
    setBuyPrice("");
    setBuyFee("");
  };

  /*
   * 刪除投資紀錄
   *
   * 注意：
   * 這裡只刪除紀錄，
   * 不自動反推目前持股，
   * 避免把你原本的持股資料一起弄亂。
   */
  const deleteStockLog = (
    id: string
  ) => {
    setStockLogs((current) =>
      current.filter(
        (log) => log.id !== id
      )
    );
  };

  /*
   * 投資總投入成本
   */
  const totalCost =
    stocks.reduce(
      (total, stock) =>
        total +
        stock.shares *
          stock.cost,
      0
    );

  /*
   * 目前總市值
   */
  const totalValue =
    stocks.reduce(
      (total, stock) => {
        const quote =
          quotes[stock.code];

        if (
          !quote ||
          quote.price === null
        ) {
          return total;
        }

        return (
          total +
          stock.shares *
            quote.price
        );
      },
      0
    );

  const totalProfit =
    totalValue - totalCost;

  const totalReturn =
    totalCost === 0
      ? 0
      : (totalProfit /
          totalCost) *
        100;

  const historyDates =
    Array.from(
      new Set(
        stockLogs.map(
          (log) => log.date
        )
      )
    ).sort((a, b) =>
      b.localeCompare(a)
    );

  return (
    <section className="page-section">
      <h1>📈 股票</h1>

      <p>
        這裡是 Atlas OS
        的投資追蹤中心。
      </p>

      {/* =========================
          市場行情
      ========================== */}
      <div className="page-card">
        <h2>📡 市場行情</h2>

        <p>
          {isLoading
            ? "正在取得最新行情……"
            : "行情已更新"}
        </p>

        {lastUpdated && (
          <p>
            最後更新：
            {" "}
            {lastUpdated}
          </p>
        )}

        {quoteError && (
          <p>
            ⚠️ {quoteError}
          </p>
        )}

        <button
          type="button"
          onClick={fetchQuotes}
          disabled={isLoading}
        >
          🔄 立即更新行情
        </button>
      </div>

      {/* =========================
          投資總覽
      ========================== */}
      <div className="page-card">
        <h2>💰 投資總覽</h2>

        <p>
          投入成本：
          {" "}
          {totalCost.toLocaleString(
            "zh-TW",
            {
              maximumFractionDigits: 2,
            }
          )}
        </p>

        <p>
          目前市值：
          {" "}
          {totalValue.toLocaleString(
            "zh-TW",
            {
              maximumFractionDigits: 2,
            }
          )}
        </p>

        <p>
          未實現損益：
          {" "}
          {totalProfit.toLocaleString(
            "zh-TW",
            {
              maximumFractionDigits: 2,
            }
          )}
        </p>

        <p>
          報酬率：
          {" "}
          {totalReturn.toFixed(2)}
          %
        </p>
      </div>

      {/* =========================
          目前持股
      ========================== */}
      <div className="page-card">
        <h2>📊 我的持股</h2>

        {stocks.map((stock) => {
          const quote =
            quotes[stock.code];

          const currentPrice =
            quote?.price ?? null;

          const costValue =
            stock.shares *
            stock.cost;

          const marketValue =
            currentPrice === null
              ? 0
              : stock.shares *
                currentPrice;

          const profit =
            currentPrice === null
              ? null
              : marketValue -
                costValue;

          const returnRate =
            profit === null ||
            costValue === 0
              ? null
              : (profit /
                  costValue) *
                100;

          return (
            <div
              key={stock.id}
              style={{
                marginBottom:
                  "30px",
                paddingBottom:
                  "20px",
                borderBottom:
                  "1px solid #E5E7EB",
              }}
            >
              <h3>
                {stock.code}　
                {stock.name}
              </h3>

              <div
                style={{
                  marginBottom:
                    "15px",
                  padding: "12px",
                  background:
                    "#F8F5F0",
                  borderRadius:
                    "8px",
                }}
              >
                <p>
                  <strong>
                    目前股價：
                  </strong>{" "}
                  {currentPrice !==
                  null
                    ? currentPrice.toFixed(
                        2
                      )
                    : "讀取中……"}
                </p>

                <p>
                  <strong>
                    今日漲跌：
                  </strong>{" "}
                  {quote?.change !==
                    null &&
                  quote?.change !==
                    undefined
                    ? `${
                        quote.change >=
                        0
                          ? "+"
                          : ""
                      }${quote.change.toFixed(
                        2
                      )}`
                    : "--"}
                </p>

                <p>
                  <strong>
                    今日漲跌幅：
                  </strong>{" "}
                  {quote?.changePercent !==
                    null &&
                  quote?.changePercent !==
                    undefined
                    ? `${
                        quote.changePercent >=
                        0
                          ? "+"
                          : ""
                      }${quote.changePercent.toFixed(
                        2
                      )}%`
                    : "--"}
                </p>
              </div>

              <div
                style={{
                  marginTop:
                    "15px",
                }}
              >
                <p>
                  <strong>
                    持有股數：
                  </strong>{" "}
                  {stock.shares}
                  {" "}
                  股
                </p>

                <p>
                  <strong>
                    平均成本：
                  </strong>{" "}
                  {stock.cost.toFixed(
                    2
                  )}
                </p>

                <p>
                  <strong>
                    投入成本：
                  </strong>{" "}
                  {costValue.toLocaleString(
                    "zh-TW",
                    {
                      maximumFractionDigits:
                        2,
                    }
                  )}
                </p>

                <p>
                  <strong>
                    目前市值：
                  </strong>{" "}
                  {currentPrice ===
                  null
                    ? "--"
                    : marketValue.toLocaleString(
                        "zh-TW",
                        {
                          maximumFractionDigits:
                            2,
                        }
                      )}
                </p>

                <p>
                  <strong>
                    未實現損益：
                  </strong>{" "}
                  {profit === null
                    ? "--"
                    : profit.toLocaleString(
                        "zh-TW",
                        {
                          maximumFractionDigits:
                            2,
                        }
                      )}
                </p>

                <p>
                  <strong>
                    報酬率：
                  </strong>{" "}
                  {returnRate ===
                  null
                    ? "--"
                    : `${returnRate.toFixed(
                        2
                      )}%`}
                </p>
              </div>

              <label
                style={{
                  display:
                    "block",
                  marginTop:
                    "15px",
                }}
              >
                <strong>
                  投資備註：
                </strong>

                <textarea
                  value={
                    stock.note
                  }
                  onChange={(
                    event
                  ) =>
                    updateStockNote(
                      stock.id,
                      event.target
                        .value
                    )
                  }
                  placeholder="例如：長期持有、預計分批加碼……"
                  rows={3}
                  style={{
                    display:
                      "block",
                    width:
                      "100%",
                    marginTop:
                      "8px",
                    padding:
                      "8px",
                    boxSizing:
                      "border-box",
                    resize:
                      "vertical",
                  }}
                />
              </label>
            </div>
          );
        })}
      </div>

      {/* =========================
          投資紀錄
      ========================== */}
      <div className="page-card">
        <h2>📝 投資紀錄</h2>

        <div
          style={{
            display: "grid",
            gap: "15px",
          }}
        >
          <label>
            <strong>
              買入日期：
            </strong>

            <input
              type="date"
              value={buyDate}
              onChange={(event) =>
                setBuyDate(
                  event.target.value
                )
              }
              style={{
                display:
                  "block",
                marginTop:
                  "8px",
                padding:
                  "8px",
              }}
            />
          </label>

          <label>
            <strong>
              股票：
            </strong>

            <select
              value={
                selectedStock
              }
              onChange={(event) =>
                setSelectedStock(
                  event.target.value
                )
              }
              style={{
                display:
                  "block",
                marginTop:
                  "8px",
                padding:
                  "8px",
              }}
            >
              {stocks.map(
                (stock) => (
                  <option
                    key={
                      stock.id
                    }
                    value={
                      stock.code
                    }
                  >
                    {stock.code}{" "}
                    {stock.name}
                  </option>
                )
              )}
            </select>
          </label>

          <label>
            <strong>
              買入股數：
            </strong>

            <input
              type="number"
              min="1"
              step="1"
              value={
                buyShares
              }
              onChange={(event) =>
                setBuyShares(
                  event.target.value
                )
              }
              placeholder="例如：10"
              style={{
                display:
                  "block",
                marginTop:
                  "8px",
                padding:
                  "8px",
              }}
            />
          </label>

          <label>
            <strong>
              買入價格：
            </strong>

            <input
              type="number"
              min="0"
              step="0.01"
              value={
                buyPrice
              }
              onChange={(event) =>
                setBuyPrice(
                  event.target.value
                )
              }
              placeholder="例如：102.85"
              style={{
                display:
                  "block",
                marginTop:
                  "8px",
                padding:
                  "8px",
              }}
            />
          </label>

          <label>
            <strong>
              手續費：
            </strong>

            <input
              type="number"
              min="0"
              step="0.01"
              value={
                buyFee
              }
              onChange={(event) =>
                setBuyFee(
                  event.target.value
                )
              }
              placeholder="例如：1"
              style={{
                display:
                  "block",
                marginTop:
                  "8px",
                padding:
                  "8px",
              }}
            />
          </label>
        </div>

        <button
          type="button"
          onClick={
            addStockLog
          }
          disabled={
            !buyDate ||
            !buyShares ||
            !buyPrice
          }
          style={{
            marginTop:
              "20px",
          }}
        >
          ＋ 儲存買入紀錄
        </button>
      </div>

      {/* =========================
          歷史投資紀錄
      ========================== */}
      <div className="page-card">
        <h2>📅 投資歷史</h2>

        {historyDates.length ===
        0 ? (
          <p>
            還沒有投資紀錄。
          </p>
        ) : (
          historyDates.map(
            (date) => {
              const logsForDate =
                stockLogs.filter(
                  (log) =>
                    log.date ===
                    date
                );

              return (
                <div
                  key={date}
                  style={{
                    marginBottom:
                      "30px",
                  }}
                >
                  <h3>
                    📅 {date}
                  </h3>

                  <ul>
                    {logsForDate.map(
                      (log) => {
                        const stock =
                          stocks.find(
                            (
                              item
                            ) =>
                              item.code ===
                              log.code
                          );

                        const total =
                          log.shares *
                            log.price +
                          log.fee;

                        return (
                          <li
                            key={
                              log.id
                            }
                            style={{
                              marginBottom:
                                "18px",
                            }}
                          >
                            <strong>
                              {
                                log.code
                              }{" "}
                              {
                                stock?.name
                              }
                            </strong>

                            <div
                              style={{
                                marginTop:
                                  "6px",
                                lineHeight:
                                  "1.8",
                              }}
                            >
                              買入股數：
                              {" "}
                              {
                                log.shares
                              }{" "}
                              股
                              <br />

                              買入價格：
                              {" "}
                              {log.price.toFixed(
                                2
                              )}

                              <br />

                              手續費：
                              {" "}
                              {log.fee.toFixed(
                                2
                              )}

                              <br />

                              本次投入：
                              {" "}
                              {total.toLocaleString(
                                "zh-TW",
                                {
                                  maximumFractionDigits:
                                    2,
                                }
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                deleteStockLog(
                                  log.id
                                )
                              }
                              style={{
                                marginTop:
                                  "8px",
                                fontSize:
                                  "12px",
                              }}
                            >
                              刪除紀錄
                            </button>
                          </li>
                        );
                      }
                    )}
                  </ul>
                </div>
              );
            }
          )
        )}
      </div>
    </section>
  );
}

export default StockCenter;