import { useEffect, useState } from "react";

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

function CareCenter() {
  const today = new Date().toLocaleDateString("en-CA");

  const [completedTasks, setCompletedTasks] = useState<string[]>(() => {
    const saved = localStorage.getItem("atlas-care-tasks");

    if (!saved) {
      return [];
    }

    try {
      return JSON.parse(saved) as string[];
    } catch {
      return [];
    }
  });

  const [careLogs, setCareLogs] = useState<CareLog[]>(() => {
    const saved = localStorage.getItem("atlas-care-logs");

    if (!saved) {
      return [];
    }

    try {
      return JSON.parse(saved) as CareLog[];
    } catch {
      return [];
    }
  });

  const [selectedCategory, setSelectedCategory] =
    useState("今日狀態");

  const [content, setContent] = useState("");

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

  const toggleTask = (task: string) => {
    setCompletedTasks((current) => {
      if (current.includes(task)) {
        return current.filter((item) => item !== task);
      }

      return [...current, task];
    });
  };

  const addCareLog = () => {
    if (!content.trim()) {
      return;
    }

    const newLog: CareLog = {
      id: Date.now().toString(),
      date: today,
      category: selectedCategory,
      content: content.trim(),
    };

    setCareLogs((current) => [newLog, ...current]);

    setContent("");
  };

  const deleteCareLog = (id: string) => {
    setCareLogs((current) =>
      current.filter((log) => log.id !== id)
    );
  };

  const completedCount = completedTasks.length;
  const totalTasks = careTasks.length;

  const todayProgress =
    totalTasks === 0
      ? 0
      : Math.round((completedCount / totalTasks) * 100);

  const todayLogs = careLogs.filter(
    (log) => log.date === today
  );

  const historyDates = Array.from(
    new Set(careLogs.map((log) => log.date))
  ).sort((a, b) => b.localeCompare(a));

  return (
    <section className="page-section">
      <h1>❤️ 爸爸照護</h1>

      <p>
        這裡是 Atlas OS 的爸爸照護紀錄中心。
      </p>

      {/* 今日照護 */}
      <div className="page-card">
        <h2>📋 今日照護</h2>

        <p>
          這裡只代表今天的照護事項是否完成。
        </p>

        <ul>
          {careTasks.map((task) => {
            const completed = completedTasks.includes(task);

            return (
              <li key={task}>
                <label>
                  <input
                    type="checkbox"
                    checked={completed}
                    onChange={() => toggleTask(task)}
                  />

                  <span
                    style={{
                      marginLeft: "8px",
                      textDecoration: completed
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

      {/* 今日完成度 */}
      <div className="page-card">
        <h2>📊 今日照護完成度</h2>

        <p>
          已完成 {completedCount} / {totalTasks} 項
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
              transition: "width 0.3s ease",
            }}
          />
        </div>

        <p>{todayProgress}%</p>
      </div>

      {/* 新增照護紀錄 */}
      <div className="page-card">
        <h2>📝 記錄今天的照護</h2>

        <div style={{ marginBottom: "15px" }}>
          <label>
            <strong>紀錄類別：</strong>

            <select
              value={selectedCategory}
              onChange={(event) =>
                setSelectedCategory(event.target.value)
              }
              style={{
                marginLeft: "10px",
                padding: "6px",
              }}
            >
              <option value="今日狀態">
                今日狀態
              </option>

              <option value="飲食">
                飲食
              </option>

              <option value="身體紀錄">
                身體紀錄
              </option>

              <option value="服用藥物">
                服用藥物
              </option>

              <option value="其他">
                其他
              </option>
            </select>
          </label>
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label>
            <strong>內容：</strong>
          </label>

          <textarea
            value={content}
            onChange={(event) =>
              setContent(event.target.value)
            }
            placeholder="例如：今天早餐吃半碗粥，午餐吃雞肉；精神狀況普通。"
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
                    deleteCareLog(log.id)
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

      {/* 照護歷史 */}
      <div className="page-card">
        <h2>📅 照護歷史</h2>

        {historyDates.length === 0 ? (
          <p>
            還沒有歷史照護紀錄。
          </p>
        ) : (
          historyDates.map((date) => {
            const logsForDate = careLogs.filter(
              (log) => log.date === date
            );

            return (
              <div
                key={date}
                style={{
                  marginBottom: "30px",
                }}
              >
                <h3>
                  📅 {date}
                </h3>

                <ul>
                  {logsForDate.map((log) => (
                    <li
                      key={log.id}
                      style={{
                        marginBottom: "15px",
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
                    </li>
                  ))}
                </ul>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

export default CareCenter;