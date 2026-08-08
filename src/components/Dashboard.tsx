import { useEffect, useMemo, useState } from "react";
import "./Dashboard.css";

type ScheduleItem = {
  id: string;
  date: string;
  time: string;
  title: string;
  completed: boolean;
};

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
  previousClose: number | null;
  change: number | null;
  changePercent: number | null;
  updatedAt: string;
};

const studyTasks = [
  "行政法",
  "行政學",
  "政治學",
  "公共政策",
  "憲法與法緒",
  "英文 7000 字",
];

function Dashboard() {
  const today = new Date().toLocaleDateString("en-CA");

  const [completedTasks, setCompletedTasks] =
    useState<string[]>([]);

  const [schedules, setSchedules] =
    useState<ScheduleItem[]>([]);

  const [stocks, setStocks] =
    useState<Stock[]>([]);

  const [quotes, setQuotes] =
    useState<Record<string, StockQuote>>({});

  const [userName, setUserName] =
    useState("Mio");

  useEffect(() => {
    const savedStudy =
      localStorage.getItem(
        "atlas-study-tasks"
      );

    if (savedStudy) {
      try {
        setCompletedTasks(
          JSON.parse(savedStudy) as string[]
        );
      } catch {
        setCompletedTasks([]);
      }
    }

    const savedSchedules =
      localStorage.getItem(
        "atlas-schedules"
      );

    if (savedSchedules) {
      try {
        setSchedules(
          JSON.parse(
            savedSchedules
          ) as ScheduleItem[]
        );
      } catch {
        setSchedules([]);
      }
    }

    const savedStocks =
      localStorage.getItem(
        "atlas-stocks"
      );

    if (savedStocks) {
      try {
        setStocks(
          JSON.parse(
            savedStocks
          ) as Stock[]
        );
      } catch {
        setStocks([]);
      }
    }

    const savedSettings =
      localStorage.getItem(
        "atlas-settings"
      );

    if (savedSettings) {
      try {
        const settings =
          JSON.parse(savedSettings);

        if (
          settings.userName &&
          typeof settings.userName ===
            "string"
        ) {
          setUserName(
            settings.userName
          );
        }
      } catch {
        setUserName("Mio");
      }
    }
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      const savedStudy =
        localStorage.getItem(
          "atlas-study-tasks"
        );

      if (savedStudy) {
        try {
          setCompletedTasks(
            JSON.parse(
              savedStudy
            ) as string[]
          );
        } catch {
          setCompletedTasks([]);
        }
      }

      const savedSchedules =
        localStorage.getItem(
          "atlas-schedules"
        );

      if (savedSchedules) {
        try {
          setSchedules(
            JSON.parse(
              savedSchedules
            ) as ScheduleItem[]
          );
        } catch {
          setSchedules([]);
        }
      }

      const savedStocks =
        localStorage.getItem(
          "atlas-stocks"
        );

      if (savedStocks) {
        try {
          setStocks(
            JSON.parse(
              savedStocks
            ) as Stock[]
          );
        } catch {
          setStocks([]);
        }
      }
    };

    window.addEventListener(
      "storage",
      handleStorageChange
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorageChange
      );
    };
  }, []);

  useEffect(() => {
    const fetchQuotes = async () => {
      if (stocks.length === 0) {
        return;
      }

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
          return;
        }

        const data = await response.json();

        if (
          !data.msgArray ||
          data.msgArray.length === 0
        ) {
          return;
        }

        const quoteMap: Record<
          string,
          StockQuote
        > = {};

        data.msgArray.forEach(
          (item: {
            c: string;
            z: string;
            y: string;
            t: string;
          }) => {
            const currentPrice =
              item.z &&
              item.z !== "-"
                ? Number(item.z)
                : null;

            const previousClose =
              item.y &&
              item.y !== "-"
                ? Number(item.y)
                : null;

            const price =
              currentPrice !== null &&
              Number.isFinite(
                currentPrice
              )
                ? currentPrice
                : previousClose !== null &&
                    Number.isFinite(
                      previousClose
                    )
                  ? previousClose
                  : null;

            const validPreviousClose =
              previousClose !== null &&
              Number.isFinite(
                previousClose
              )
                ? previousClose
                : null;

            let change:
              | number
              | null = null;

            if (
              price !== null &&
              validPreviousClose !==
                null
            ) {
              change =
                price -
                validPreviousClose;
            }

            let changePercent:
              | number
              | null = null;

            if (
              change !== null &&
              validPreviousClose !==
                null &&
              validPreviousClose > 0
            ) {
              changePercent =
                (change /
                  validPreviousClose) *
                100;
            }

            quoteMap[item.c] = {
              price,
              previousClose:
                validPreviousClose,
              change,
              changePercent,
              updatedAt:
                item.t || "",
            };
          }
        );

        setQuotes(quoteMap);
      } catch {
        setQuotes({});
      }
    };

    fetchQuotes();
  }, [stocks]);

  const completedStudyCount =
    completedTasks.filter((task) =>
      studyTasks.includes(task)
    ).length;

  const studyProgress =
    studyTasks.length === 0
      ? 0
      : Math.round(
          (completedStudyCount /
            studyTasks.length) *
            100
        );

  const todaySchedules =
    useMemo(() => {
      return schedules
        .filter(
          (item) =>
            item.date === today
        )
        .sort((a, b) =>
          a.time.localeCompare(
            b.time
          )
        );
    }, [schedules, today]);

  const completedScheduleCount =
    todaySchedules.filter(
      (item) => item.completed
    ).length;

  const scheduleProgress =
    todaySchedules.length === 0
      ? 0
      : Math.round(
          (completedScheduleCount /
            todaySchedules.length) *
            100
        );

  const totalCost = stocks.reduce(
    (total, stock) =>
      total +
      stock.shares *
        stock.cost,
    0
  );

  const totalValue = stocks.reduce(
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

  const formatMoney = (
    value: number
  ) => {
    return value.toLocaleString(
      "zh-TW",
      {
        maximumFractionDigits: 2,
      }
    );
  };

  const navigateTo = (
    page:
      | "study"
      | "care"
      | "stock"
      | "schedule"
  ) => {
    window.dispatchEvent(
      new CustomEvent(
        "atlas:navigate",
        {
          detail: page,
        }
      )
    );
  };

  return (
    <section className="page-section">
      <h1>
        🦊 歡迎回來，{userName}
      </h1>

      <p>
        今天也往前一點點。Atlas
        正在幫你整理今天的重要事項。
      </p>

      {/* 今日總覽 */}
      <div className="page-card">
        <h2>☀️ 今日總覽</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "15px",
            marginTop: "15px",
          }}
        >
          <div
            style={{
              padding: "15px",
              background:
                "#F8F5F0",
              borderRadius: "10px",
            }}
          >
            <strong>
              📖 國考
            </strong>

            <p>
              {completedStudyCount} /{" "}
              {studyTasks.length} 項
            </p>

            <strong>
              {studyProgress}%
            </strong>
          </div>

          <div
            style={{
              padding: "15px",
              background:
                "#F8F5F0",
              borderRadius: "10px",
            }}
          >
            <strong>
              🗓️ 行程
            </strong>

            <p>
              {completedScheduleCount} /{" "}
              {todaySchedules.length} 項
            </p>

            <strong>
              {scheduleProgress}%
            </strong>
          </div>

          <div
            style={{
              padding: "15px",
              background:
                "#F8F5F0",
              borderRadius: "10px",
            }}
          >
            <strong>
              📈 投資
            </strong>

            <p>
              目前市值
            </p>

            <strong>
              {formatMoney(
                totalValue
              )}
            </strong>
          </div>

          <div
            style={{
              padding: "15px",
              background:
                "#F8F5F0",
              borderRadius: "10px",
            }}
          >
            <strong>
              🦊 Atlas
            </strong>

            <p>
              系統狀態
            </p>

            <strong>
              正常運作
            </strong>
          </div>
        </div>
      </div>

      {/* 國考 */}
      <div className="page-card">
        <h2>📖 國考進度</h2>

        <p>
          今日完成{" "}
          {completedStudyCount} /{" "}
          {studyTasks.length} 項
        </p>

        <div
          style={{
            width: "100%",
            height: "12px",
            background:
              "#E5E7EB",
            borderRadius:
              "999px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${studyProgress}%`,
              height: "100%",
              background:
                "#C8B59B",
              transition:
                "width 0.3s ease",
            }}
          />
        </div>

        <p>
          {studyProgress}%
        </p>

        <button
          type="button"
          onClick={() =>
            navigateTo("study")
          }
        >
          📖 前往國考中心
        </button>
      </div>

      {/* 行事曆 */}
      <div className="page-card">
        <h2>🗓️ 今日行程</h2>

        {todaySchedules.length ===
        0 ? (
          <p>
            今天還沒有安排行程。
          </p>
        ) : (
          <ul>
            {todaySchedules
              .slice(0, 5)
              .map((item) => (
                <li
                  key={item.id}
                  style={{
                    marginBottom:
                      "8px",
                    textDecoration:
                      item.completed
                        ? "line-through"
                        : "none",
                    opacity:
                      item.completed
                        ? 0.55
                        : 1,
                  }}
                >
                  <strong>
                    {item.time}
                  </strong>{" "}
                  {item.title}
                </li>
              ))}
          </ul>
        )}

        <button
          type="button"
          onClick={() =>
            navigateTo("schedule")
          }
        >
          🗓️ 前往行事曆
        </button>
      </div>

      {/* 股票 */}
      <div className="page-card">
        <h2>📈 投資總覽</h2>

        <p>
          投入成本：
          {" "}
          {formatMoney(
            totalCost
          )}
        </p>

        <p>
          目前市值：
          {" "}
          {formatMoney(
            totalValue
          )}
        </p>

        <p>
          未實現損益：
          {" "}
          {formatMoney(
            totalProfit
          )}
        </p>

        <button
          type="button"
          onClick={() =>
            navigateTo("stock")
          }
        >
          📈 前往股票中心
        </button>
      </div>

      {/* 今日重點 */}
      <div className="page-card">
        <h2>🎯 今日重點</h2>

        <ul>
          <li>
            📖 國考：
            {" "}
            {studyProgress ===
            100
              ? "今日學習目標完成！"
              : `目前完成 ${studyProgress}%`}
          </li>

          <li>
            🗓️ 行程：
            {" "}
            {todaySchedules.length ===
            0
              ? "目前沒有安排"
              : `還有 ${
                  todaySchedules.length -
                  completedScheduleCount
                } 項待完成`}
          </li>

          <li>
            📈 投資：
            {" "}
            {totalProfit >= 0
              ? `目前未實現損益 +${formatMoney(
                  totalProfit
                )}`
              : `目前未實現損益 ${formatMoney(
                  totalProfit
                )}`}
          </li>
        </ul>
      </div>
    </section>
  );
}

export default Dashboard;