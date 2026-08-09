import { useEffect, useMemo, useState } from "react";

type ScheduleItem = {
  id: string;
  date: string;
  time: string;
  title: string;
  completed: boolean;
};

function ScheduleCenter() {
  const today = new Date().toLocaleDateString("en-CA");

  const [selectedDate, setSelectedDate] = useState(today);
  const [schedules, setSchedules] = useState<ScheduleItem[]>(() => {
    const saved = localStorage.getItem("atlas-schedules");
    if (!saved) return [];
    try {
      return JSON.parse(saved) as ScheduleItem[];
    } catch {
      return [];
    }
  });

  const [time, setTime] = useState("");
  const [title, setTitle] = useState("");

  // 歷史紀錄篩選
  const [historySearch, setHistorySearch] = useState("");
  const [historyStartDate, setHistoryStartDate] = useState("");
  const [historyEndDate, setHistoryEndDate] = useState("");
  const [historyStatus, setHistoryStatus] = useState("全部");

  useEffect(() => {
    localStorage.setItem("atlas-schedules", JSON.stringify(schedules));
  }, [schedules]);

  const todaySchedules = useMemo(() => {
    return schedules
      .filter((item) => item.date === selectedDate)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [schedules, selectedDate]);

  const completedCount = todaySchedules.filter(
    (item) => item.completed
  ).length;

  const totalCount = todaySchedules.length;

  const progress =
    totalCount === 0
      ? 0
      : Math.round((completedCount / totalCount) * 100);

  const addSchedule = () => {
    if (!title.trim()) return;

    const newSchedule: ScheduleItem = {
      id: Date.now().toString(),
      date: selectedDate,
      time: time || "未設定",
      title: title.trim(),
      completed: false,
    };

    setSchedules((current) => [...current, newSchedule]);
    setTime("");
    setTitle("");
  };

  const toggleSchedule = (id: string) => {
    setSchedules((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, completed: !item.completed }
          : item
      )
    );
  };

  const deleteSchedule = (id: string) => {
    setSchedules((current) =>
      current.filter((item) => item.id !== id)
    );
  };

  const clearCompleted = () => {
    setSchedules((current) =>
      current.filter(
        (item) =>
          !(item.date === selectedDate && item.completed)
      )
    );
  };

  const clearHistoryFilters = () => {
    setHistorySearch("");
    setHistoryStartDate("");
    setHistoryEndDate("");
    setHistoryStatus("全部");
  };

  const filteredHistorySchedules = useMemo(() => {
    const keyword = historySearch.trim().toLowerCase();

    return schedules
      .filter((item) => {
        if (historyStartDate && item.date < historyStartDate) {
          return false;
        }

        if (historyEndDate && item.date > historyEndDate) {
          return false;
        }

        if (
          historyStatus === "已完成" &&
          !item.completed
        ) {
          return false;
        }

        if (
          historyStatus === "未完成" &&
          item.completed
        ) {
          return false;
        }

        if (
          keyword &&
          !`${item.date} ${item.time} ${item.title}`
            .toLowerCase()
            .includes(keyword)
        ) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (a.date !== b.date) {
          return b.date.localeCompare(a.date);
        }
        return a.time.localeCompare(b.time);
      });
  }, [
    schedules,
    historySearch,
    historyStartDate,
    historyEndDate,
    historyStatus,
  ]);

  const historyGroups = useMemo(() => {
    const groups = new Map<string, ScheduleItem[]>();

    filteredHistorySchedules.forEach((item) => {
      const current = groups.get(item.date) ?? [];
      current.push(item);
      groups.set(item.date, current);
    });

    return Array.from(groups.entries());
  }, [filteredHistorySchedules]);

  return (
    <section className="page-section">
      <h1>🗓️ 行事曆</h1>
      <p>這裡是 Atlas OS 的行程管理中心。</p>

      <div className="page-card">
        <h2>📅 選擇日期</h2>

        <input
          type="date"
          value={selectedDate}
          onChange={(event) => setSelectedDate(event.target.value)}
          style={{ padding: "8px", fontSize: "16px" }}
        />

        {selectedDate === today && <p>📌 今天</p>}
      </div>

      <div className="page-card">
        <h2>➕ 新增行程</h2>

        <div
          style={{
            display: "grid",
            gap: "12px",
          }}
        >
          <label>
            時間：
            <input
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              style={{
                marginLeft: "10px",
                padding: "7px",
              }}
            />
          </label>

          <label>
            行程：
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") addSchedule();
              }}
              placeholder="例如：行政法第 3 章"
              style={{
                marginLeft: "10px",
                padding: "8px",
                width: "260px",
                maxWidth: "80%",
              }}
            />
          </label>

          <div>
            <button
              type="button"
              onClick={addSchedule}
              disabled={!title.trim()}
            >
              ＋ 新增行程
            </button>
          </div>
        </div>
      </div>

      <div className="page-card">
        <h2>📊 今日進度</h2>

        <p>
          已完成 {completedCount} / {totalCount} 項
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
              width: `${progress}%`,
              height: "100%",
              background: "#C8B59B",
              transition: "width 0.3s ease",
            }}
          />
        </div>

        <p>{progress}%</p>
      </div>

      <div className="page-card">
        <h2>
          📋{" "}
          {selectedDate === today
            ? "今日行程"
            : `${selectedDate} 行程`}
        </h2>

        {todaySchedules.length === 0 ? (
          <p>這一天還沒有安排任何行程。</p>
        ) : (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
            }}
          >
            {todaySchedules.map((item) => (
              <li
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 0",
                  borderBottom: "1px solid #E5E7EB",
                }}
              >
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={() => toggleSchedule(item.id)}
                />

                <span
                  style={{
                    minWidth: "70px",
                    fontWeight: "bold",
                  }}
                >
                  {item.time}
                </span>

                <span
                  style={{
                    flex: 1,
                    textDecoration: item.completed
                      ? "line-through"
                      : "none",
                    opacity: item.completed ? 0.55 : 1,
                  }}
                >
                  {item.title}
                </span>

                <button
                  type="button"
                  onClick={() => deleteSchedule(item.id)}
                  style={{ fontSize: "12px" }}
                >
                  🗑️
                </button>
              </li>
            ))}
          </ul>
        )}

        {todaySchedules.some((item) => item.completed) && (
          <button
            type="button"
            onClick={clearCompleted}
            style={{ marginTop: "15px" }}
          >
            清除已完成行程
          </button>
        )}
      </div>

      {/* 行程歷史：搜尋＋日期篩選 */}
      <div className="page-card">
        <h2>📅 行程歷史</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "10px",
            marginBottom: "15px",
          }}
        >
          <input
            type="search"
            value={historySearch}
            onChange={(event) => setHistorySearch(event.target.value)}
            placeholder="🔎 搜尋日期、時間或行程"
            style={{ padding: "8px" }}
          />

          <select
            value={historyStatus}
            onChange={(event) => setHistoryStatus(event.target.value)}
            style={{ padding: "8px" }}
          >
            <option value="全部">全部狀態</option>
            <option value="已完成">已完成</option>
            <option value="未完成">未完成</option>
          </select>

          <label>
            起始日期
            <input
              type="date"
              value={historyStartDate}
              onChange={(event) => setHistoryStartDate(event.target.value)}
              style={{ display: "block", width: "100%", padding: "7px" }}
            />
          </label>

          <label>
            結束日期
            <input
              type="date"
              value={historyEndDate}
              onChange={(event) => setHistoryEndDate(event.target.value)}
              style={{ display: "block", width: "100%", padding: "7px" }}
            />
          </label>
        </div>

        <button type="button" onClick={clearHistoryFilters}>
          清除篩選
        </button>

        <p style={{ marginTop: "15px" }}>
          共找到 {filteredHistorySchedules.length} 筆行程
        </p>

        {historyGroups.length === 0 ? (
          <p>沒有符合條件的行程。</p>
        ) : (
          historyGroups.map(([date, items]) => (
            <div key={date} style={{ marginBottom: "30px" }}>
              <h3>📅 {date}</h3>

              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                }}
              >
                {items.map((item) => (
                  <li
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px 0",
                      borderBottom: "1px solid #E5E7EB",
                    }}
                  >
                    <span style={{ minWidth: "70px", fontWeight: "bold" }}>
                      {item.time}
                    </span>

                    <span
                      style={{
                        flex: 1,
                        textDecoration: item.completed
                          ? "line-through"
                          : "none",
                        opacity: item.completed ? 0.55 : 1,
                      }}
                    >
                      {item.title}
                    </span>

                    <span>{item.completed ? "✅" : "⬜"}</span>

                    <button
                      type="button"
                      onClick={() => deleteSchedule(item.id)}
                      style={{ fontSize: "12px" }}
                    >
                      刪除
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default ScheduleCenter;
