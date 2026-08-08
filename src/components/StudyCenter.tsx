import { useEffect, useState } from "react";

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
  const today = new Date().toISOString().split("T")[0];

  const [completedTasks, setCompletedTasks] = useState<string[]>(() => {
    const saved = localStorage.getItem("atlas-study-tasks");

    if (!saved) {
      return [];
    }

    try {
      return JSON.parse(saved) as string[];
    } catch {
      return [];
    }
  });

  const [subjects, setSubjects] = useState<Subject[]>(() => {
    const saved = localStorage.getItem("atlas-study-subjects");

    if (!saved) {
      return defaultSubjects;
    }

    try {
      return JSON.parse(saved) as Subject[];
    } catch {
      return defaultSubjects;
    }
  });

  const [studyLogs, setStudyLogs] = useState<StudyLog[]>(() => {
    const saved = localStorage.getItem("atlas-study-logs");

    if (!saved) {
      return [];
    }

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

  const toggleTask = (task: string) => {
    setCompletedTasks((current) => {
      if (current.includes(task)) {
        return current.filter((item) => item !== task);
      }

      return [...current, task];
    });
  };

  const updateProgress = (id: string, value: number) => {
    setSubjects((current) =>
      current.map((subject) =>
        subject.id === id
          ? { ...subject, progress: value }
          : subject
      )
    );
  };

  const addStudyLog = () => {
    if (!topic.trim()) {
      return;
    }

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

  const completedCount = completedTasks.length;
  const totalTasks = studyTasks.length;

  const todayProgress =
    totalTasks === 0
      ? 0
      : Math.round((completedCount / totalTasks) * 100);

  const todayLogs = studyLogs.filter(
    (log) => log.date === today
  );

  const todayMinutes = todayLogs.reduce(
    (total, log) => total + log.minutes,
    0
  );

  const historyDates = Array.from(
    new Set(studyLogs.map((log) => log.date))
  ).sort((a, b) => b.localeCompare(a));

  return (
    <section className="page-section">
      <h1>📖 國考</h1>

      <p>
        這裡是 Atlas OS 的國考學習中心。
      </p>

      {/* 今日讀書 */}
      <div className="page-card">
        <h2>📚 今日讀書</h2>

        <p>
          這裡只代表「今天的目標是否完成」，
          不代表整科學完。
        </p>

        <ul>
          {studyTasks.map((task) => {
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

      {/* 今日達成 */}
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
          今天累計：{todayMinutes} 分鐘
        </p>

        {todayLogs.length === 0 ? (
          <p>
            今天還沒有學習紀錄。
          </p>
        ) : (
          <ul>
            {todayLogs.map((log) => (
              <li
                key={log.id}
                style={{
                  marginBottom: "15px",
                }}
              >
                <strong>
                  {log.subject}
                </strong>

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

      {/* 學習歷史 */}
      <div className="page-card">
        <h2>📅 學習歷史</h2>

        {historyDates.length === 0 ? (
          <p>
            還沒有歷史學習紀錄。
          </p>
        ) : (
          historyDates.map((date) => {
            const logsForDate = studyLogs.filter(
              (log) => log.date === date
            );

            const totalMinutes = logsForDate.reduce(
              (total, log) => total + log.minutes,
              0
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

                <p>
                  當日讀書時間：{totalMinutes} 分鐘
                </p>

                <ul>
                  {logsForDate.map((log) => (
                    <li
                      key={log.id}
                      style={{
                        marginBottom: "15px",
                      }}
                    >
                      <strong>
                        {log.subject}
                      </strong>

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
                    </li>
                  ))}
                </ul>
              </div>
            );
          })
        )}
      </div>

      {/* 各科整體進度 */}
      <div className="page-card">
        <h2>📈 各科整體進度</h2>

        <p>
          這裡代表整個國考準備進度，與「今日讀書」獨立。
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
              <strong>
                {subject.name}
              </strong>

              <span>
                {subject.progress}%
              </span>
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
    </section>
  );
}

export default StudyCenter;