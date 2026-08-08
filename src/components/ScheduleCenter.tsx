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

  const [selectedDate, setSelectedDate] =
    useState(today);

  const [schedules, setSchedules] =
    useState<ScheduleItem[]>(() => {
      const saved =
        localStorage.getItem(
          "atlas-schedules"
        );

      if (!saved) {
        return [];
      }

      try {
        return JSON.parse(
          saved
        ) as ScheduleItem[];
      } catch {
        return [];
      }
    });

  const [time, setTime] =
    useState("");

  const [title, setTitle] =
    useState("");

  useEffect(() => {
    localStorage.setItem(
      "atlas-schedules",
      JSON.stringify(schedules)
    );
  }, [schedules]);

  const todaySchedules =
    useMemo(() => {
      return schedules
        .filter(
          (item) =>
            item.date === selectedDate
        )
        .sort((a, b) =>
          a.time.localeCompare(b.time)
        );
    }, [
      schedules,
      selectedDate,
    ]);

  const completedCount =
    todaySchedules.filter(
      (item) => item.completed
    ).length;

  const totalCount =
    todaySchedules.length;

  const progress =
    totalCount === 0
      ? 0
      : Math.round(
          (completedCount /
            totalCount) *
            100
        );

  const addSchedule = () => {
    if (!title.trim()) {
      return;
    }

    const newSchedule: ScheduleItem = {
      id: Date.now().toString(),
      date: selectedDate,
      time: time || "未設定",
      title: title.trim(),
      completed: false,
    };

    setSchedules((current) => [
      ...current,
      newSchedule,
    ]);

    setTime("");
    setTitle("");
  };

  const toggleSchedule = (
    id: string
  ) => {
    setSchedules((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              completed:
                !item.completed,
            }
          : item
      )
    );
  };

  const deleteSchedule = (
    id: string
  ) => {
    setSchedules((current) =>
      current.filter(
        (item) => item.id !== id
      )
    );
  };

  const clearCompleted = () => {
    setSchedules((current) =>
      current.filter(
        (item) =>
          !(
            item.date ===
              selectedDate &&
            item.completed
          )
      )
    );
  };

  return (
    <section className="page-section">
      <h1>🗓️ 行事曆</h1>

      <p>
        這裡是 Atlas OS
        的行程管理中心。
      </p>

      {/* 日期 */}
      <div className="page-card">
        <h2>📅 選擇日期</h2>

        <input
          type="date"
          value={selectedDate}
          onChange={(event) =>
            setSelectedDate(
              event.target.value
            )
          }
          style={{
            padding: "8px",
            fontSize: "16px",
          }}
        />

        {selectedDate ===
          today && (
          <p>
            📌 今天
          </p>
        )}
      </div>

      {/* 新增行程 */}
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
              onChange={(event) =>
                setTime(
                  event.target.value
                )
              }
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
              onChange={(event) =>
                setTitle(
                  event.target.value
                )
              }
              onKeyDown={(event) => {
                if (
                  event.key ===
                  "Enter"
                ) {
                  addSchedule();
                }
              }}
              placeholder="例如：行政法第3章"
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
              onClick={
                addSchedule
              }
              disabled={
                !title.trim()
              }
            >
              ＋ 新增行程
            </button>
          </div>
        </div>
      </div>

      {/* 今日進度 */}
      <div className="page-card">
        <h2>📊 今日進度</h2>

        <p>
          已完成{" "}
          {completedCount} /{" "}
          {totalCount} 項
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
              width: `${progress}%`,
              height: "100%",
              background:
                "#C8B59B",
              transition:
                "width 0.3s ease",
            }}
          />
        </div>

        <p>
          {progress}%
        </p>
      </div>

      {/* 行程列表 */}
      <div className="page-card">
        <h2>
          📋{" "}
          {selectedDate ===
          today
            ? "今日行程"
            : `${selectedDate} 行程`}
        </h2>

        {todaySchedules.length ===
        0 ? (
          <p>
            今天還沒有安排任何行程。
          </p>
        ) : (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
            }}
          >
            {todaySchedules.map(
              (item) => (
                <li
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems:
                      "center",
                    gap: "12px",
                    padding:
                      "12px 0",
                    borderBottom:
                      "1px solid #E5E7EB",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={
                      item.completed
                    }
                    onChange={() =>
                      toggleSchedule(
                        item.id
                      )
                    }
                  />

                  <span
                    style={{
                      minWidth:
                        "70px",
                      fontWeight:
                        "bold",
                    }}
                  >
                    {item.time}
                  </span>

                  <span
                    style={{
                      flex: 1,
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
                    {item.title}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      deleteSchedule(
                        item.id
                      )
                    }
                    style={{
                      fontSize:
                        "12px",
                    }}
                  >
                    🗑️
                  </button>
                </li>
              )
            )}
          </ul>
        )}

        {todaySchedules.some(
          (item) =>
            item.completed
        ) && (
          <button
            type="button"
            onClick={
              clearCompleted
            }
            style={{
              marginTop:
                "15px",
            }}
          >
            清除已完成行程
          </button>
        )}
      </div>
    </section>
  );
}

export default ScheduleCenter;