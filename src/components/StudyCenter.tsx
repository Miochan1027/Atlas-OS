import { useEffect, useMemo, useState } from "react";

type Subject = {
  id: string;
  name: string;
  progress: number;
};

type StudyLog = {
  id: string;
  date: string;
  subject: string;
  topic: string;
  minutes: number;
};

const defaultSubjects: Subject[] = [
  { id: "admin-law", name: "行政法", progress: 0 },
  { id: "admin-science", name: "行政學", progress: 0 },
  { id: "political-science", name: "政治學", progress: 0 },
  { id: "public-policy", name: "公共政策", progress: 0 },
  { id: "constitution", name: "憲法與法緒", progress: 0 },
  { id: "english", name: "英文 7000 字", progress: 0 },
];

const studyTasks = [
  "行政法",
  "行政學",
  "政治學",
  "公共政策",
  "憲法與法緒",
  "英文 7000 字",
];

function StudyCenter() {
  const today = new Date().toLocaleDateString("en-CA");

  // =====================================================
  // State
  // =====================================================

  const [activeTab, setActiveTab] = useState<"daily" | "history">(
    "daily"
  );

  const [completedTasks, setCompletedTasks] = useState<string[]>(() => {
    const saved = localStorage.getItem("atlas-study-tasks");

    if (!saved) return [];

    try {
      return JSON.parse(saved) as string[];
    } catch {
      return [];
    }
  });

  const [subjects, setSubjects] = useState<Subject[]>(() => {
    const saved = localStorage.getItem("atlas-study-subjects");

    if (!saved) return defaultSubjects;

    try {
      return JSON.parse(saved) as Subject[];
    } catch {
      return defaultSubjects;
    }
  });

  const [studyLogs, setStudyLogs] = useState<StudyLog[]>(() => {
    const saved = localStorage.getItem("atlas-study-logs");

    if (!saved) return [];

    try {
      return JSON.parse(saved) as StudyLog[];
    } catch {
      return [];
    }
  });

  const [selectedSubject, setSelectedSubject] =
    useState("行政法");

  const [topic, setTopic] = useState("");
  const [minutes, setMinutes] = useState(60);

  // 歷程報表日期
  const [historyStart, setHistoryStart] = useState("");
  const [historyEnd, setHistoryEnd] = useState(today);

  // =====================================================
  // LocalStorage
  // =====================================================

  useEffect(() => {
    localStorage.setItem(
      "atlas-study-tasks",
      JSON.stringify(completedTasks)
    );
  }, [completedTasks]);

  useEffect(() => {
    localStorage.setItem(
      "atlas-study-subjects",
      JSON.stringify(subjects)
    );
  }, [subjects]);

  useEffect(() => {
    localStorage.setItem(
      "atlas-study-logs",
      JSON.stringify(studyLogs)
    );
  }, [studyLogs]);

  // =====================================================
  // 今日目標
  // =====================================================

  const toggleTask = (task: string) => {
    setCompletedTasks((current) => {
      if (current.includes(task)) {
        return current.filter((item) => item !== task);
      }

      return [...current, task];
    });
  };

  const completedCount = completedTasks.length;
  const totalTasks = studyTasks.length;

  const todayProgress =
    totalTasks === 0
      ? 0
      : Math.round((completedCount / totalTasks) * 100);

  // =====================================================
  // 新增學習紀錄
  // =====================================================

  const addStudyLog = () => {
    if (!topic.trim()) return;

    const newLog: StudyLog = {
      id: Date.now().toString(),
      date: today,
      subject: selectedSubject,
      topic: topic.trim(),
      minutes,
    };

    setStudyLogs((current) => [newLog, ...current]);

    setTopic("");
    setMinutes(60);
  };

  const deleteStudyLog = (id: string) => {
    setStudyLogs((current) =>
      current.filter((log) => log.id !== id)
    );
  };

  // =====================================================
  // 今日資料
  // =====================================================

  const todayLogs = studyLogs.filter(
    (log) => log.date === today
  );

  const todayMinutes = todayLogs.reduce(
    (total, log) => total + log.minutes,
    0
  );

  // =====================================================
  // 歷程報表
  // =====================================================

  const filteredHistoryLogs = useMemo(() => {
    return studyLogs
      .filter((log) => {
        if (historyStart && log.date < historyStart) {
          return false;
        }

        if (historyEnd && log.date > historyEnd) {
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
  }, [studyLogs, historyStart, historyEnd]);

  const historyTotalMinutes = filteredHistoryLogs.reduce(
    (total, log) => total + log.minutes,
    0
  );

  const historyStudyDays = new Set(
    filteredHistoryLogs.map((log) => log.date)
  ).size;

  const subjectMinutes = subjects.map((subject) => {
    const total = filteredHistoryLogs
      .filter((log) => log.subject === subject.name)
      .reduce((sum, log) => sum + log.minutes, 0);

    return {
      ...subject,
      minutes: total,
    };
  });

  const historyByDate = useMemo(() => {
    const grouped: Record<string, StudyLog[]> = {};

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
  // 各科整體進度
  // =====================================================

  const updateProgress = (id: string, value: number) => {
    setSubjects((current) =>
      current.map((subject) =>
        subject.id === id
          ? { ...subject, progress: value }
          : subject
      )
    );
  };

  // =====================================================
  // 列印
  // =====================================================

  const printHistory = () => {
    window.print();
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <section className="page-section">
      <h1>📖 國考</h1>

      <p>
        Atlas OS 國考學習中心
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
            fontWeight: activeTab === "daily" ? 700 : 400,
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
            fontWeight: activeTab === "history" ? 700 : 400,
            background:
              activeTab === "history"
                ? "#C8B59B"
                : "#F3F3F3",
          }}
        >
          📊 歷程報表
        </button>
      </div>

      {/* =================================================
          日常紀錄
      ================================================= */}

      {activeTab === "daily" && (
        <>
          {/* 今日讀書目標 */}

          <div className="page-card">
            <h2>📚 今日讀書</h2>

            <p>
              這裡只代表今天的目標是否完成，
              不代表整科學完。
            </p>

            <ul>
              {studyTasks.map((task) => {
                const completed =
                  completedTasks.includes(task);

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
            <h2>📊 今日達成</h2>

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

          {/* 新增學習紀錄 */}

          <div className="page-card">
            <h2>📝 記錄今天念了什麼</h2>

            <div style={{ marginBottom: "15px" }}>
              <label>
                <strong>科目：</strong>

                <select
                  value={selectedSubject}
                  onChange={(event) =>
                    setSelectedSubject(event.target.value)
                  }
                  style={{
                    marginLeft: "10px",
                    padding: "6px",
                  }}
                >
                  {studyTasks.map((subject) => (
                    <option
                      key={subject}
                      value={subject}
                    >
                      {subject}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>
                <strong>讀書時間：</strong>

                <input
                  type="number"
                  min="1"
                  value={minutes}
                  onChange={(event) =>
                    setMinutes(Number(event.target.value))
                  }
                  style={{
                    width: "80px",
                    marginLeft: "10px",
                    padding: "6px",
                  }}
                />

                <span style={{ marginLeft: "5px" }}>
                  分鐘
                </span>
              </label>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label>
                <strong>今天念了什麼：</strong>
              </label>

              <textarea
                value={topic}
                onChange={(event) =>
                  setTopic(event.target.value)
                }
                placeholder="例如：行政程序法－行政處分、比例原則；複習老師講義第 3～5 章"
                rows={4}
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
              onClick={addStudyLog}
              disabled={!topic.trim()}
              style={{
                padding: "8px 18px",
                cursor: topic.trim()
                  ? "pointer"
                  : "not-allowed",
              }}
            >
              ＋ 儲存學習紀錄
            </button>
          </div>

          {/* 今日學習紀錄 */}

          <div className="page-card">
            <h2>📋 今日學習紀錄</h2>

            <p>
              今天累計：
              <strong>{todayMinutes}</strong> 分鐘
            </p>

            {todayLogs.length === 0 ? (
              <p>今天還沒有學習紀錄。</p>
            ) : (
              <ul>
                {todayLogs.map((log) => (
                  <li
                    key={log.id}
                    style={{
                      marginBottom: "15px",
                    }}
                  >
                    <strong>{log.subject}</strong>

                    <span>
                      {" "}
                      · {log.minutes} 分鐘
                    </span>

                    <div
                      style={{
                        marginTop: "5px",
                      }}
                    >
                      {log.topic}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        deleteStudyLog(log.id)
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

          {/* 各科整體進度 */}

          <div className="page-card">
            <h2>📈 各科整體進度</h2>

            <p>
              這裡代表整個國考準備進度，
              與「今日讀書」獨立。
            </p>

            {subjects.map((subject) => (
              <div
                key={subject.id}
                style={{
                  marginBottom: "20px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "6px",
                  }}
                >
                  <strong>{subject.name}</strong>

                  <span>{subject.progress}%</span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={subject.progress}
                  onChange={(event) =>
                    updateProgress(
                      subject.id,
                      Number(event.target.value)
                    )
                  }
                  style={{
                    width: "100%",
                  }}
                />
              </div>
            ))}
          </div>
        </>
      )}

      {/* =================================================
          歷程報表
      ================================================= */}

      {activeTab === "history" && (
        <div id="study-history-report">

          <div className="page-card">
            <h2>📊 國考學習歷程報表</h2>

            <p>
              這裡專門查看一段期間的學習成果，
              與「日常紀錄」分開。
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
                    setHistoryStart(event.target.value)
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
                    setHistoryEnd(event.target.value)
                  }
                  style={{
                    marginLeft: "8px",
                    padding: "7px",
                  }}
                />
              </label>

              <button
                type="button"
                onClick={printHistory}
                style={{
                  padding: "8px 18px",
                }}
              >
                🖨️ 列印報表
              </button>
            </div>

            {/* 統計 */}

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(180px,1fr))",
                gap: "12px",
                marginBottom: "25px",
              }}
            >
              <div className="page-card">
                <strong>📚 總讀書時間</strong>
                <h2>{historyTotalMinutes} 分鐘</h2>
              </div>

              <div className="page-card">
                <strong>📅 實際讀書天數</strong>
                <h2>{historyStudyDays} 天</h2>
              </div>

              <div className="page-card">
                <strong>📝 學習紀錄</strong>
                <h2>{filteredHistoryLogs.length} 筆</h2>
              </div>
            </div>

            {/* 各科統計 */}

            <div className="page-card">
              <h3>📚 各科學習時間</h3>

              {subjectMinutes.map((subject) => (
                <div
                  key={subject.id}
                  style={{
                    marginBottom: "16px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <strong>{subject.name}</strong>

                    <span>
                      {subject.minutes} 分鐘
                    </span>
                  </div>

                  <div
                    style={{
                      width: "100%",
                      height: "8px",
                      background: "#E5E7EB",
                      borderRadius: "999px",
                      marginTop: "6px",
                    }}
                  >
                    <div
                      style={{
                        width:
                          historyTotalMinutes > 0
                            ? `${
                                (subject.minutes /
                                  historyTotalMinutes) *
                                100
                              }%`
                            : "0%",
                        height: "100%",
                        background: "#C8B59B",
                        borderRadius: "999px",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* 每日明細 */}

            <div className="page-card">
              <h3>📅 每日學習明細</h3>

              {historyByDate.length === 0 ? (
                <p>這段期間沒有學習紀錄。</p>
              ) : (
                historyByDate.map(
                  ([date, logs]) => {
                    const dailyMinutes =
                      logs.reduce(
                        (sum, log) =>
                          sum + log.minutes,
                        0
                      );

                    return (
                      <div
                        key={date}
                        style={{
                          marginBottom: "28px",
                          paddingBottom: "20px",
                          borderBottom:
                            "1px solid #eee",
                        }}
                      >
                        <h3>📅 {date}</h3>

                        <p>
                          當日讀書時間：
                          <strong>
                            {dailyMinutes}
                          </strong>{" "}
                          分鐘
                        </p>

                        <ul>
                          {logs.map((log) => (
                            <li
                              key={log.id}
                              style={{
                                marginBottom: "10px",
                              }}
                            >
                              <strong>
                                {log.subject}
                              </strong>

                              {" · "}

                              {log.minutes} 分鐘

                              <div
                                style={{
                                  marginTop: "4px",
                                }}
                              >
                                {log.topic}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  }
                )
              )}
            </div>

          </div>
        </div>
      )}
    </section>
  );
}

export default StudyCenter;