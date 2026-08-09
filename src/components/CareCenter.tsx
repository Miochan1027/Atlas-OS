import { useEffect, useMemo, useState } from "react";

type CareLog = {
  id: string;
  date: string;
  category: string;
  content: string;
};

const careTasks = [
  "早餐",
  "午餐",
  "晚餐",
  "今日狀態",
  "身體紀錄",
  "服用藥物",
];

const careCategories = [
  "今日狀態",
  "飲食",
  "身體紀錄",
  "服用藥物",
  "其他",
];

function CareCenter() {
  const today = new Date().toLocaleDateString("en-CA");

  // =====================================================
  // State
  // =====================================================

  const [activeTab, setActiveTab] = useState<
    "daily" | "history"
  >("daily");

  const [completedTasks, setCompletedTasks] =
    useState<string[]>(() => {
      const saved =
        localStorage.getItem("atlas-care-tasks");

      if (!saved) return [];

      try {
        return JSON.parse(saved) as string[];
      } catch {
        return [];
      }
    });

  const [careLogs, setCareLogs] = useState<CareLog[]>(
    () => {
      const saved =
        localStorage.getItem("atlas-care-logs");

      if (!saved) return [];

      try {
        return JSON.parse(saved) as CareLog[];
      } catch {
        return [];
      }
    }
  );

  const [selectedCategory, setSelectedCategory] =
    useState("今日狀態");

  const [content, setContent] = useState("");

  // 回診報表日期
  const [historyStart, setHistoryStart] =
    useState("");

  const [historyEnd, setHistoryEnd] =
    useState(today);

  // =====================================================
  // LocalStorage
  // =====================================================

  useEffect(() => {
    localStorage.setItem(
      "atlas-care-tasks",
      JSON.stringify(completedTasks)
    );
  }, [completedTasks]);

  useEffect(() => {
    localStorage.setItem(
      "atlas-care-logs",
      JSON.stringify(careLogs)
    );
  }, [careLogs]);

  // =====================================================
  // 今日照護
  // =====================================================

  const toggleTask = (task: string) => {
    setCompletedTasks((current) => {
      if (current.includes(task)) {
        return current.filter(
          (item) => item !== task
        );
      }

      return [...current, task];
    });
  };

  const completedCount = completedTasks.length;
  const totalTasks = careTasks.length;

  const todayProgress =
    totalTasks === 0
      ? 0
      : Math.round(
          (completedCount / totalTasks) * 100
        );

  // =====================================================
  // 新增照護紀錄
  // =====================================================

  const addCareLog = () => {
    if (!content.trim()) return;

    const newLog: CareLog = {
      id: Date.now().toString(),
      date: today,
      category: selectedCategory,
      content: content.trim(),
    };

    setCareLogs((current) => [
      newLog,
      ...current,
    ]);

    setContent("");
  };

  const deleteCareLog = (id: string) => {
    setCareLogs((current) =>
      current.filter((log) => log.id !== id)
    );
  };

  // =====================================================
  // 今日資料
  // =====================================================

  const todayLogs = careLogs.filter(
    (log) => log.date === today
  );

  // =====================================================
  // 回診歷程報表
  // =====================================================

  const filteredHistoryLogs = useMemo(() => {
    return careLogs
      .filter((log) => {
        if (
          historyStart &&
          log.date < historyStart
        ) {
          return false;
        }

        if (
          historyEnd &&
          log.date > historyEnd
        ) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (a.date !== b.date) {
          return b.date.localeCompare(a.date);
        }

        return b.id.localeCompare(a.id);
      });
  }, [careLogs, historyStart, historyEnd]);

  const historyDays = new Set(
    filteredHistoryLogs.map((log) => log.date)
  ).size;

  // =====================================================
  // 類別統計
  // =====================================================

  const categoryStats = careCategories.map(
    (category) => ({
      category,
      count: filteredHistoryLogs.filter(
        (log) => log.category === category
      ).length,
    })
  );

  // =====================================================
  // 每日分組
  // =====================================================

  const historyByDate = useMemo(() => {
    const grouped: Record<string, CareLog[]> = {};

    filteredHistoryLogs.forEach((log) => {
      if (!grouped[log.date]) {
        grouped[log.date] = [];
      }

      grouped[log.date].push(log);
    });

    return Object.entries(grouped).sort((a, b) =>
      b[0].localeCompare(a[0])
    );
  }, [filteredHistoryLogs]);

  // =====================================================
  // 列印
  // =====================================================

  const printMedicalReport = () => {
    window.print();
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <section className="page-section">
      <h1>❤️ 爸爸照護</h1>

      <p>
        Atlas OS 爸爸照護紀錄中心
      </p>

      {/* =================================================
          分頁
      ================================================= */}

      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "24px",
          borderBottom: "1px solid #ddd",
          paddingBottom: "12px",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("daily")}
          style={{
            padding: "10px 18px",
            borderRadius: "10px",
            border: "none",
            cursor: "pointer",
            fontWeight:
              activeTab === "daily"
                ? 700
                : 400,
            background:
              activeTab === "daily"
                ? "#C8B59B"
                : "#F3F3F3",
          }}
        >
          📝 日常紀錄
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("history")}
          style={{
            padding: "10px 18px",
            borderRadius: "10px",
            border: "none",
            cursor: "pointer",
            fontWeight:
              activeTab === "history"
                ? 700
                : 400,
            background:
              activeTab === "history"
                ? "#C8B59B"
                : "#F3F3F3",
          }}
        >
          🩺 歷程報表
        </button>
      </div>

      {/* =================================================
          日常紀錄
      ================================================= */}

      {activeTab === "daily" && (
        <>
          {/* 今日照護 */}

          <div className="page-card">
            <h2>📋 今日照護</h2>

            <p>
              這裡只代表今天的照護事項是否完成。
            </p>

            <ul>
              {careTasks.map((task) => {
                const completed =
                  completedTasks.includes(task);

                return (
                  <li key={task}>
                    <label>
                      <input
                        type="checkbox"
                        checked={completed}
                        onChange={() =>
                          toggleTask(task)
                        }
                      />

                      <span
                        style={{
                          marginLeft: "8px",
                          textDecoration:
                            completed
                              ? "line-through"
                              : "none",
                        }}
                      >
                        {task}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* 完成度 */}

          <div className="page-card">
            <h2>📊 今日照護完成度</h2>

            <p>
              已完成 {completedCount} /{" "}
              {totalTasks} 項
            </p>

            <div
              style={{
                width: "100%",
                height: "12px",
                background: "#E5E7EB",
                borderRadius: "999px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${todayProgress}%`,
                  height: "100%",
                  background: "#C8B59B",
                  transition:
                    "width 0.3s ease",
                }}
              />
            </div>

            <p>{todayProgress}%</p>
          </div>

          {/* 新增紀錄 */}

          <div className="page-card">
            <h2>📝 記錄今天的照護</h2>

            <div
              style={{
                marginBottom: "15px",
              }}
            >
              <label>
                <strong>
                  紀錄類別：
                </strong>

                <select
                  value={selectedCategory}
                  onChange={(event) =>
                    setSelectedCategory(
                      event.target.value
                    )
                  }
                  style={{
                    marginLeft: "10px",
                    padding: "6px",
                  }}
                >
                  {careCategories.map(
                    (category) => (
                      <option
                        key={category}
                        value={category}
                      >
                        {category}
                      </option>
                    )
                  )}
                </select>
              </label>
            </div>

            <div
              style={{
                marginBottom: "15px",
              }}
            >
              <label>
                <strong>內容：</strong>
              </label>

              <textarea
                value={content}
                onChange={(event) =>
                  setContent(
                    event.target.value
                  )
                }
                placeholder={
                  "例如：早餐吃半碗粥，午餐吃雞肉；精神狀況普通。"
                }
                rows={5}
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: "8px",
                  padding: "10px",
                  boxSizing: "border-box",
                  resize: "vertical",
                }}
              />
            </div>

            <button
              type="button"
              onClick={addCareLog}
              disabled={!content.trim()}
              style={{
                padding: "8px 18px",
                cursor: content.trim()
                  ? "pointer"
                  : "not-allowed",
              }}
            >
              ＋ 儲存照護紀錄
            </button>
          </div>

          {/* 今日紀錄 */}

          <div className="page-card">
            <h2>📋 今日紀錄</h2>

            {todayLogs.length === 0 ? (
              <p>
                今天還沒有照護紀錄。
              </p>
            ) : (
              <ul>
                {todayLogs.map((log) => (
                  <li
                    key={log.id}
                    style={{
                      marginBottom: "18px",
                    }}
                  >
                    <strong>
                      {log.category}
                    </strong>

                    <div
                      style={{
                        marginTop: "5px",
                      }}
                    >
                      {log.content}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        deleteCareLog(
                          log.id
                        )
                      }
                      style={{
                        marginTop: "6px",
                        fontSize: "12px",
                      }}
                    >
                      刪除
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {/* =================================================
          歷程報表
      ================================================= */}

      {activeTab === "history" && (
        <div id="care-medical-report">

          <div className="page-card">
            <h2>🩺 爸爸照護歷程報表</h2>

            <p>
              這裡專門整理回診期間的照護資料，
              可直接列印提供醫師參考。
            </p>

            {/* 日期 */}

            <div
              style={{
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
                marginBottom: "20px",
              }}
            >
              <label>
                開始日期：
                <input
                  type="date"
                  value={historyStart}
                  onChange={(event) =>
                    setHistoryStart(
                      event.target.value
                    )
                  }
                  style={{
                    marginLeft: "8px",
                    padding: "7px",
                  }}
                />
              </label>

              <label>
                結束日期：
                <input
                  type="date"
                  value={historyEnd}
                  onChange={(event) =>
                    setHistoryEnd(
                      event.target.value
                    )
                  }
                  style={{
                    marginLeft: "8px",
                    padding: "7px",
                  }}
                />
              </label>

              <button
                type="button"
                onClick={
                  printMedicalReport
                }
                style={{
                  padding: "8px 18px",
                }}
              >
                🖨️ 列印回診報表
              </button>
            </div>

            {/* 回診摘要 */}

            <div className="page-card">
              <h3>📋 期間摘要</h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit,minmax(180px,1fr))",
                  gap: "12px",
                }}
              >
                <div>
                  <strong>
                    紀錄天數
                  </strong>

                  <h2>
                    {historyDays} 天
                  </h2>
                </div>

                <div>
                  <strong>
                    照護紀錄
                  </strong>

                  <h2>
                    {filteredHistoryLogs.length}{" "}
                    筆
                  </h2>
                </div>
              </div>
            </div>

            {/* 類別統計 */}

            <div className="page-card">
              <h3>📊 紀錄類別統計</h3>

              {categoryStats.map(
                (item) => (
                  <div
                    key={item.category}
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      padding:
                        "8px 0",
                      borderBottom:
                        "1px solid #eee",
                    }}
                  >
                    <span>
                      {item.category}
                    </span>

                    <strong>
                      {item.count} 筆
                    </strong>
                  </div>
                )
              )}
            </div>

            {/* 每日紀錄 */}

            <div className="page-card">
              <h3>
                📅 每日照護紀錄
              </h3>

              {historyByDate.length ===
              0 ? (
                <p>
                  這段期間沒有照護紀錄。
                </p>
              ) : (
                historyByDate.map(
                  ([date, logs]) => (
                    <div
                      key={date}
                      style={{
                        marginBottom:
                          "28px",
                        paddingBottom:
                          "20px",
                        borderBottom:
                          "1px solid #eee",
                      }}
                    >
                      <h3>
                        📅 {date}
                      </h3>

                      {logs.map((log) => (
                        <div
                          key={log.id}
                          style={{
                            marginBottom:
                              "14px",
                            paddingLeft:
                              "10px",
                            borderLeft:
                              "3px solid #C8B59B",
                          }}
                        >
                          <strong>
                            {log.category}
                          </strong>

                          <div
                            style={{
                              marginTop:
                                "5px",
                              lineHeight:
                                1.7,
                            }}
                          >
                            {log.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )
              )}
            </div>

            {/* 醫師提醒 */}

            <div className="page-card">
              <h3>🩺 回診時可提供醫師查看</h3>

              <p
                style={{
                  lineHeight: 1.8,
                  color: "#666",
                }}
              >
                本報表為家屬日常照護紀錄，
                可作為回診時與醫療團隊討論的參考資料。
                實際醫療判斷仍以醫師評估為準。
              </p>
            </div>

          </div>
        </div>
      )}
    </section>
  );
}

export default CareCenter;