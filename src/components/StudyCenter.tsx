import { useEffect, useMemo, useState } from "react";

type StudyRecord = {
  id: string;
  date: string;
  completedSubjects: string[];
  studyMinutes: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = "atlas-study-records";

const SUBJECTS = [
  "行政法",
  "行政學",
  "政治學",
  "公共政策",
  "憲法與法緒",
  "英文 7000 字",
];

const getToday = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatDate = (date: string) => {
  if (!date) return "";

  const [year, month, day] = date.split("-");

  return `${year} 年 ${month} 月 ${day} 日`;
};

const loadRecords = (): StudyRecord[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed;
  } catch {
    return [];
  }
};

function StudyCenter() {
  // =====================================================
  // 基本狀態
  // =====================================================

  const [records, setRecords] = useState<StudyRecord[]>(loadRecords);

  const [currentDate, setCurrentDate] = useState(getToday);

  const [completedSubjects, setCompletedSubjects] = useState<string[]>([]);

  const [studyMinutes, setStudyMinutes] = useState(0);

  const [notes, setNotes] = useState("");

  const [activeTab, setActiveTab] = useState<
    "daily" | "history"
  >("daily");

  // =====================================================
  // 歷程搜尋
  // =====================================================

  const [searchText, setSearchText] = useState("");

  const [startDate, setStartDate] = useState("");

  const [endDate, setEndDate] = useState("");

  // =====================================================
  // 儲存資料
  // =====================================================

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(records)
    );
  }, [records]);

  // =====================================================
  // 依日期載入當天資料
  // =====================================================

  useEffect(() => {
    const existing = records.find(
      (record) => record.date === currentDate
    );

    if (existing) {
      setCompletedSubjects(
        existing.completedSubjects
      );

      setStudyMinutes(existing.studyMinutes);

      setNotes(existing.notes);
    } else {
      setCompletedSubjects([]);

      setStudyMinutes(0);

      setNotes("");
    }
  }, [currentDate, records]);

  // =====================================================
  // 今日完成率
  // =====================================================

  const progress =
    SUBJECTS.length === 0
      ? 0
      : Math.round(
          (completedSubjects.length /
            SUBJECTS.length) *
            100
        );

  // =====================================================
  // 勾選科目
  // =====================================================

  const toggleSubject = (subject: string) => {
    setCompletedSubjects((current) => {
      if (current.includes(subject)) {
        return current.filter(
          (item) => item !== subject
        );
      }

      return [...current, subject];
    });
  };

  // =====================================================
  // 儲存今日紀錄
  // =====================================================

  const saveDailyRecord = () => {
    const now = new Date().toISOString();

    setRecords((current) => {
      const existing = current.find(
        (record) => record.date === currentDate
      );

      if (existing) {
        return current.map((record) => {
          if (record.date !== currentDate) {
            return record;
          }

          return {
            ...record,
            completedSubjects,
            studyMinutes,
            notes,
            updatedAt: now,
          };
        });
      }

      const newRecord: StudyRecord = {
        id: crypto.randomUUID(),
        date: currentDate,
        completedSubjects,
        studyMinutes,
        notes,
        createdAt: now,
        updatedAt: now,
      };

      return [newRecord, ...current];
    });

    window.alert(
      `✅ ${formatDate(currentDate)} 的國考學習紀錄已儲存。`
    );
  };

  // =====================================================
  // 清除當天紀錄
  // =====================================================

  const clearDailyRecord = () => {
    const confirmed = window.confirm(
      `確定要清除 ${formatDate(
        currentDate
      )} 的學習紀錄嗎？`
    );

    if (!confirmed) {
      return;
    }

    setRecords((current) =>
      current.filter(
        (record) => record.date !== currentDate
      )
    );

    setCompletedSubjects([]);

    setStudyMinutes(0);

    setNotes("");
  };

  // =====================================================
  // 歷程篩選
  // =====================================================

  const filteredRecords = useMemo(() => {
    const keyword = searchText
      .trim()
      .toLowerCase();

    return [...records]
      .filter((record) => {
        if (
          startDate &&
          record.date < startDate
        ) {
          return false;
        }

        if (
          endDate &&
          record.date > endDate
        ) {
          return false;
        }

        if (!keyword) {
          return true;
        }

        const searchableText = [
          record.date,
          record.completedSubjects.join(" "),
          record.notes,
          String(record.studyMinutes),
        ]
          .join(" ")
          .toLowerCase();

        return searchableText.includes(keyword);
      })
      .sort((a, b) =>
        b.date.localeCompare(a.date)
      );
  }, [
    records,
    searchText,
    startDate,
    endDate,
  ]);

  // =====================================================
  // 清除篩選
  // =====================================================

  const clearFilters = () => {
    setSearchText("");
    setStartDate("");
    setEndDate("");
  };

  // =====================================================
  // 載入某一天
  // =====================================================

  const openRecord = (date: string) => {
    setCurrentDate(date);

    setActiveTab("daily");
  };

  // =====================================================
  // 乾淨列印文件
  //
  // 注意：
  // 這裡不是 window.print() 直接印目前網頁。
  // 而是另外建立一份只有「每日學習紀錄」
  // 的乾淨 HTML 文件。
  // =====================================================

  const printDailyRecord = (
    record: StudyRecord
  ) => {
    const printWindow = window.open(
      "",
      "_blank",
      "width=900,height=800"
    );

    if (!printWindow) {
      window.alert(
        "無法開啟列印文件。請確認瀏覽器沒有封鎖彈出視窗。"
      );

      return;
    }

    const completedHtml =
      record.completedSubjects.length > 0
        ? record.completedSubjects
            .map(
              (subject) =>
                `<li>${subject}</li>`
            )
            .join("")
        : `<li>今日沒有完成科目</li>`;

    const hours = Math.floor(
      record.studyMinutes / 60
    );

    const minutes =
      record.studyMinutes % 60;

    const studyTime =
      hours > 0
        ? `${hours} 小時 ${minutes} 分鐘`
        : `${minutes} 分鐘`;

    const notesHtml = record.notes
      ? record.notes
          .replace(/\n/g, "<br />")
      : "今日沒有補充紀錄。";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="zh-Hant">
      <head>
        <meta charset="UTF-8" />

        <title>
          國考每日學習紀錄 - ${record.date}
        </title>

        <style>
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            color: #40372f;
            font-family:
              "Noto Sans TC",
              "Microsoft JhengHei",
              sans-serif;
          }

          .document {
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
            padding: 48px;
          }

          .header {
            border-bottom: 2px solid #d8c5ad;
            padding-bottom: 20px;
            margin-bottom: 28px;
          }

          .title {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
          }

          .subtitle {
            font-size: 15px;
            color: #897b6d;
          }

          .date {
            margin-top: 16px;
            font-size: 18px;
            font-weight: 600;
          }

          .section {
            margin-bottom: 26px;
          }

          .section-title {
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid #eadfd3;
          }

          .summary {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
          }

          .summary-box {
            border: 1px solid #e5d8ca;
            border-radius: 10px;
            padding: 16px;
          }

          .summary-label {
            font-size: 13px;
            color: #897b6d;
            margin-bottom: 6px;
          }

          .summary-value {
            font-size: 20px;
            font-weight: 700;
          }

          ul {
            margin: 0;
            padding-left: 24px;
          }

          li {
            margin-bottom: 8px;
            font-size: 16px;
          }

          .notes {
            min-height: 120px;
            border: 1px solid #e5d8ca;
            border-radius: 10px;
            padding: 16px;
            line-height: 1.8;
            font-size: 15px;
          }

          .footer {
            margin-top: 50px;
            padding-top: 16px;
            border-top: 1px solid #eadfd3;
            font-size: 12px;
            color: #a09284;
            text-align: center;
          }

          @media print {
            body {
              background: #ffffff;
            }

            .document {
              max-width: none;
              padding: 20mm;
            }
          }
        </style>
      </head>

      <body>
        <main class="document">

          <header class="header">
            <div class="title">
              📚 國考每日學習紀錄
            </div>

            <div class="subtitle">
              Atlas OS｜國考學習中心
            </div>

            <div class="date">
              ${formatDate(record.date)}
            </div>
          </header>

          <section class="section">

            <div class="section-title">
              📊 今日學習摘要
            </div>

            <div class="summary">

              <div class="summary-box">
                <div class="summary-label">
                  今日完成科目
                </div>

                <div class="summary-value">
                  ${
                    record.completedSubjects
                      .length
                  } / ${SUBJECTS.length}
                </div>
              </div>

              <div class="summary-box">
                <div class="summary-label">
                  今日讀書時間
                </div>

                <div class="summary-value">
                  ${studyTime}
                </div>
              </div>

            </div>

          </section>

          <section class="section">

            <div class="section-title">
              📖 今日完成科目
            </div>

            <ul>
              ${completedHtml}
            </ul>

          </section>

          <section class="section">

            <div class="section-title">
              📝 今日學習紀錄
            </div>

            <div class="notes">
              ${notesHtml}
            </div>

          </section>

          <div class="footer">
            Atlas OS 國考每日學習紀錄
          </div>

        </main>
      </body>
      </html>
    `);

    printWindow.document.close();

    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  // =====================================================
  // 取得目前日期的紀錄
  // =====================================================

  const currentRecord = records.find(
    (record) => record.date === currentDate
  );

  // =====================================================
  // 畫面
  // =====================================================

  return (
    <div
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "30px",
      }}
    >

      {/* =================================================
          標題
      ================================================= */}

      <div
        style={{
          marginBottom: "24px",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "32px",
            color: "#5c5148",
          }}
        >
          📚 國考
        </h1>

        <p
          style={{
            marginTop: "8px",
            color: "#9a8b7d",
          }}
        >
          Atlas OS 國考學習中心
        </p>
      </div>

      {/* =================================================
          分頁
      ================================================= */}

      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "24px",
          borderBottom:
            "1px solid #dfd4c8",
          paddingBottom: "14px",
        }}
      >
        <button
          type="button"
          onClick={() =>
            setActiveTab("daily")
          }
          style={{
            border: "none",
            borderRadius: "12px",
            padding: "12px 18px",
            background:
              activeTab === "daily"
                ? "#cdb999"
                : "#f5f3f1",
            color: "#4f463f",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          📝 日常紀錄
        </button>

        <button
          type="button"
          onClick={() =>
            setActiveTab("history")
          }
          style={{
            border: "none",
            borderRadius: "12px",
            padding: "12px 18px",
            background:
              activeTab === "history"
                ? "#cdb999"
                : "#f5f3f1",
            color: "#4f463f",
            cursor: "pointer",
            fontWeight: 600,
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
          <section
            style={{
              background: "#fff",
              borderRadius: "18px",
              padding: "26px",
              marginBottom: "24px",
              boxShadow:
                "0 4px 20px rgba(0,0,0,0.06)",
            }}
          >

            <h2
              style={{
                marginTop: 0,
                color: "#5c5148",
              }}
            >
              📝 每日學習紀錄
            </h2>

            {/* 日期 */}

            <div
              style={{
                marginBottom: "24px",
              }}
            >
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: 600,
                }}
              >
                紀錄日期
              </label>

              <input
                type="date"
                value={currentDate}
                onChange={(event) =>
                  setCurrentDate(
                    event.target.value
                  )
                }
                style={{
                  padding: "10px",
                  borderRadius: "10px",
                  border:
                    "1px solid #ddd",
                }}
              />
            </div>

            {/* 今日讀書 */}

            <div
              style={{
                marginBottom: "26px",
              }}
            >
              <h3
                style={{
                  color: "#63574d",
                }}
              >
                📚 今日讀書
              </h3>

              <p
                style={{
                  color: "#95877b",
                }}
              >
                這裡記錄今天實際完成哪些科目。
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "12px",
                }}
              >
                {SUBJECTS.map(
                  (subject) => (
                    <label
                      key={subject}
                      style={{
                        display: "flex",
                        alignItems:
                          "center",
                        gap: "10px",
                        padding: "12px 14px",
                        borderRadius: "10px",
                        background:
                          completedSubjects.includes(
                            subject
                          )
                            ? "#f3eadf"
                            : "#faf9f7",
                        cursor:
                          "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={completedSubjects.includes(
                          subject
                        )}
                        onChange={() =>
                          toggleSubject(
                            subject
                          )
                        }
                      />

                      <span>
                        {subject}
                      </span>
                    </label>
                  )
                )}
              </div>
            </div>

            {/* 今日完成率 */}

            <div
              style={{
                marginBottom: "26px",
              }}
            >
              <h3
                style={{
                  color: "#63574d",
                }}
              >
                📊 今日完成度
              </h3>

              <div
                style={{
                  color: "#95877b",
                  marginBottom: "8px",
                }}
              >
                已完成{" "}
                {
                  completedSubjects.length
                } / {SUBJECTS.length} 科
              </div>

              <div
                style={{
                  height: "12px",
                  background: "#e7e5e3",
                  borderRadius: "999px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${progress}%`,
                    height: "100%",
                    background:
                      "#bfa98b",
                    transition:
                      "width 0.2s ease",
                  }}
                />
              </div>

              <div
                style={{
                  marginTop: "8px",
                  color: "#95877b",
                }}
              >
                {progress}%
              </div>
            </div>

            {/* 讀書時間 */}

            <div
              style={{
                marginBottom: "26px",
              }}
            >
              <h3
                style={{
                  color: "#63574d",
                }}
              >
                ⏱️ 今日讀書時間
              </h3>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <input
                  type="number"
                  min="0"
                  value={studyMinutes}
                  onChange={(event) =>
                    setStudyMinutes(
                      Math.max(
                        0,
                        Number(
                          event.target.value
                        )
                      )
                    )
                  }
                  style={{
                    width: "140px",
                    padding: "10px",
                    borderRadius: "10px",
                    border:
                      "1px solid #ddd",
                  }}
                />

                <span>分鐘</span>
              </div>
            </div>

            {/* 備註 */}

            <div
              style={{
                marginBottom: "26px",
              }}
            >
              <h3
                style={{
                  color: "#63574d",
                }}
              >
                📝 今日學習心得／備註
              </h3>

              <textarea
                value={notes}
                onChange={(event) =>
                  setNotes(
                    event.target.value
                  )
                }
                placeholder="例如：今天行政法讀到行政處分，錯題集中在..."
                rows={7}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "10px",
                  border:
                    "1px solid #ddd",
                  resize: "vertical",
                  boxSizing:
                    "border-box",
                  lineHeight: 1.7,
                  fontFamily:
                    "inherit",
                }}
              />
            </div>

            {/* 操作 */}

            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={
                  saveDailyRecord
                }
                style={{
                  padding:
                    "11px 20px",
                  border: "none",
                  borderRadius: "10px",
                  background:
                    "#bfa98b",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                💾 儲存今日紀錄
              </button>

              {currentRecord && (
                <button
                  type="button"
                  onClick={() =>
                    printDailyRecord(
                      currentRecord
                    )
                  }
                  style={{
                    padding:
                      "11px 20px",
                    border:
                      "1px solid #d9cbbb",
                    borderRadius:
                      "10px",
                    background:
                      "#fff",
                    color: "#5c5148",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  🖨️ 列印每日紀錄
                </button>
              )}

              <button
                type="button"
                onClick={
                  clearDailyRecord
                }
                style={{
                  padding:
                    "11px 20px",
                  border:
                    "1px solid #ddd",
                  borderRadius:
                    "10px",
                  background:
                    "#fff",
                  color: "#806f62",
                  cursor: "pointer",
                }}
              >
                🗑️ 清除當日紀錄
              </button>
            </div>

          </section>
        </>
      )}

      {/* =================================================
          歷程報表
      ================================================= */}

      {activeTab === "history" && (
        <section
          style={{
            background: "#fff",
            borderRadius: "18px",
            padding: "26px",
            boxShadow:
              "0 4px 20px rgba(0,0,0,0.06)",
          }}
        >

          <h2
            style={{
              marginTop: 0,
              color: "#5c5148",
            }}
          >
            📊 國考學習歷程
          </h2>

          <p
            style={{
              color: "#95877b",
            }}
          >
            可以依日期或關鍵字查找過去的學習紀錄。
          </p>

          {/* 篩選 */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "12px",
              marginBottom: "18px",
            }}
          >

            <input
              type="text"
              placeholder="🔎 搜尋科目、內容或日期"
              value={searchText}
              onChange={(event) =>
                setSearchText(
                  event.target.value
                )
              }
              style={{
                padding: "11px",
                borderRadius: "10px",
                border:
                  "1px solid #ddd",
              }}
            />

            <input
              type="date"
              value={startDate}
              onChange={(event) =>
                setStartDate(
                  event.target.value
                )
              }
              style={{
                padding: "11px",
                borderRadius: "10px",
                border:
                  "1px solid #ddd",
              }}
            />

            <input
              type="date"
              value={endDate}
              onChange={(event) =>
                setEndDate(
                  event.target.value
                )
              }
              style={{
                padding: "11px",
                borderRadius: "10px",
                border:
                  "1px solid #ddd",
              }}
            />

          </div>

          <button
            type="button"
            onClick={clearFilters}
            style={{
              marginBottom: "20px",
              padding: "9px 16px",
              border:
                "1px solid #ddd",
              borderRadius: "10px",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            清除篩選
          </button>

          <div
            style={{
              color: "#95877b",
              marginBottom: "18px",
            }}
          >
            共找到{" "}
            {filteredRecords.length} 筆紀錄
          </div>

          {/* 沒資料 */}

          {filteredRecords.length === 0 && (
            <div
              style={{
                padding: "30px",
                textAlign: "center",
                color: "#a09284",
                background:
                  "#faf9f7",
                borderRadius: "12px",
              }}
            >
              沒有符合條件的國考學習紀錄。
            </div>
          )}

          {/* 歷程 */}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            {filteredRecords.map(
              (record) => (
                <div
                  key={record.id}
                  style={{
                    border:
                      "1px solid #eadfd3",
                    borderRadius: "14px",
                    padding: "18px",
                  }}
                >

                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "center",
                      gap: "12px",
                      flexWrap:
                        "wrap",
                    }}
                  >

                    <div>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: "18px",
                          color:
                            "#5c5148",
                        }}
                      >
                        📅{" "}
                        {formatDate(
                          record.date
                        )}
                      </div>

                      <div
                        style={{
                          marginTop:
                            "8px",
                          color:
                            "#95877b",
                        }}
                      >
                        完成{" "}
                        {
                          record
                            .completedSubjects
                            .length
                        } /{" "}
                        {SUBJECTS.length} 科
                        ・讀書{" "}
                        {
                          record.studyMinutes
                        } 分鐘
                      </div>
                    </div>

                    <div
                      style={{
                        display:
                          "flex",
                        gap: "8px",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          openRecord(
                            record.date
                          )
                        }
                        style={{
                          padding:
                            "8px 12px",
                          border:
                            "1px solid #ddd",
                          borderRadius:
                            "9px",
                          background:
                            "#fff",
                          cursor:
                            "pointer",
                        }}
                      >
                        查看
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          printDailyRecord(
                            record
                          )
                        }
                        style={{
                          padding:
                            "8px 12px",
                          border:
                            "1px solid #ddd",
                          borderRadius:
                            "9px",
                          background:
                            "#fff",
                          cursor:
                            "pointer",
                        }}
                      >
                        🖨️ 列印
                      </button>
                    </div>

                  </div>

                  {/* 完成科目 */}

                  {record
                    .completedSubjects
                    .length > 0 && (
                    <div
                      style={{
                        marginTop:
                          "14px",
                        paddingTop:
                          "14px",
                        borderTop:
                          "1px solid #eee",
                        color:
                          "#6f6258",
                      }}
                    >
                      <strong>
                        完成科目：
                      </strong>{" "}
                      {record.completedSubjects.join(
                        "、"
                      )}
                    </div>
                  )}

                  {/* 備註 */}

                  {record.notes && (
                    <div
                      style={{
                        marginTop:
                          "10px",
                        color:
                          "#806f62",
                        lineHeight: 1.7,
                        whiteSpace:
                          "pre-wrap",
                      }}
                    >
                      {record.notes}
                    </div>
                  )}

                </div>
              )
            )}
          </div>

        </section>
      )}

    </div>
  );
}

export default StudyCenter;