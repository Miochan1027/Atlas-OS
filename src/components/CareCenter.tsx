import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type CareCategory =
  | "今日狀態"
  | "飲食"
  | "身體紀錄"
  | "服用藥物"
  | "其他";

type CareRecord = {
  id: string;
  user_id: string;
  record_date: string;
  category: CareCategory;
  content: string;
  created_at: string;
};

const categories: CareCategory[] = [
  "今日狀態",
  "飲食",
  "身體紀錄",
  "服用藥物",
  "其他",
];

const categoryEmoji: Record<CareCategory, string> = {
  今日狀態: "📋",
  飲食: "🍚",
  身體紀錄: "🩺",
  服用藥物: "💊",
  其他: "📝",
};

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(date: string) {
  if (!date) return "";

  const parts = date.split("-");

  if (parts.length !== 3) {
    return date;
  }

  return `${parts[0]}-${parts[1]}-${parts[2]}`;
}

function CareCenter() {
  // =====================================================
  // 狀態
  // =====================================================

  const [records, setRecords] = useState<CareRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");

  // =====================================================
  // 新增紀錄
  // =====================================================

  const [recordDate, setRecordDate] =
    useState(getToday());

  const [category, setCategory] =
    useState<CareCategory>("今日狀態");

  const [content, setContent] = useState("");

  // =====================================================
  // 歷程篩選
  // =====================================================

  const [searchText, setSearchText] = useState("");

  const [startDate, setStartDate] = useState("");

  const [endDate, setEndDate] = useState(getToday());

  // =====================================================
  // 載入資料
  // =====================================================

  const loadRecords = async () => {
    setLoading(true);
    setMessage("");

    try {
      const {
        data: {
          user,
        },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage("目前尚未登入。");
        setRecords([]);
        return;
      }

      const {
        data,
        error,
      } = await supabase
        .from("care_records")
        .select(
          `
            id,
            user_id,
            record_date,
            category,
            content,
            created_at
          `
        )
        .eq("user_id", user.id)
        .order("record_date", {
          ascending: false,
        })
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error(
          "Care records loading error:",
          error
        );

        setMessage(
          `讀取照護紀錄失敗：${error.message}`
        );

        return;
      }

      setRecords(
        (data ?? []) as CareRecord[]
      );
    } catch (error) {
      console.error(
        "Care records loading exception:",
        error
      );

      setMessage(
        "讀取照護紀錄時發生錯誤。"
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // 初始化
  // =====================================================

  useEffect(() => {
    loadRecords();
  }, []);

  // =====================================================
  // 新增照護紀錄
  // =====================================================

  const handleAddRecord = async () => {
    const text = content.trim();

    if (!text) {
      setMessage("請先輸入照護紀錄內容。");
      return;
    }

    if (!recordDate) {
      setMessage("請選擇紀錄日期。");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const {
        data: {
          user,
        },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage("登入狀態已失效，請重新登入。");
        return;
      }

      const {
        data,
        error,
      } = await supabase
        .from("care_records")
        .insert({
          user_id: user.id,
          record_date: recordDate,
          category,
          content: text,
        })
        .select(
          `
            id,
            user_id,
            record_date,
            category,
            content,
            created_at
          `
        )
        .single();

      if (error) {
        console.error(
          "Care record insert error:",
          error
        );

        setMessage(
          `新增紀錄失敗：${error.message}`
        );

        return;
      }

      if (data) {
        setRecords((current) => [
          data as CareRecord,
          ...current,
        ]);
      }

      setContent("");

      setMessage("✅ 照護紀錄已儲存。");
    } catch (error) {
      console.error(
        "Care record insert exception:",
        error
      );

      setMessage(
        "新增照護紀錄時發生錯誤。"
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // 刪除紀錄
  // =====================================================

  const handleDeleteRecord = async (
    id: string
  ) => {
    const confirmed = window.confirm(
      "確定要刪除這筆照護紀錄嗎？"
    );

    if (!confirmed) {
      return;
    }

    setMessage("");

    try {
      const {
        data: {
          user,
        },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage("登入狀態已失效。");
        return;
      }

      const {
        error,
      } = await supabase
        .from("care_records")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error(
          "Care record delete error:",
          error
        );

        setMessage(
          `刪除失敗：${error.message}`
        );

        return;
      }

      setRecords((current) =>
        current.filter(
          (record) => record.id !== id
        )
      );

      setMessage("紀錄已刪除。");
    } catch (error) {
      console.error(
        "Care record delete exception:",
        error
      );

      setMessage(
        "刪除照護紀錄時發生錯誤。"
      );
    }
  };

  // =====================================================
  // 篩選歷程
  // =====================================================

  const filteredRecords = useMemo(() => {
    const keyword =
      searchText.trim().toLowerCase();

    return records.filter((record) => {
      const matchKeyword =
        !keyword ||
        record.content
          .toLowerCase()
          .includes(keyword) ||
        record.category
          .toLowerCase()
          .includes(keyword) ||
        record.record_date.includes(keyword);

      const matchStart =
        !startDate ||
        record.record_date >= startDate;

      const matchEnd =
        !endDate ||
        record.record_date <= endDate;

      return (
        matchKeyword &&
        matchStart &&
        matchEnd
      );
    });
  }, [
    records,
    searchText,
    startDate,
    endDate,
  ]);

  // =====================================================
  // 依日期整理紀錄
  // =====================================================

  const groupedRecords = useMemo(() => {
    const groups: Record<
      string,
      CareRecord[]
    > = {};

    filteredRecords.forEach((record) => {
      if (!groups[record.record_date]) {
        groups[record.record_date] = [];
      }

      groups[record.record_date].push(record);
    });

    return Object.entries(groups).sort(
      ([dateA], [dateB]) =>
        dateB.localeCompare(dateA)
    );
  }, [filteredRecords]);

  // =====================================================
  // 清除篩選
  // =====================================================

  const clearFilters = () => {
    setSearchText("");
    setStartDate("");
    setEndDate(getToday());
  };

  // =====================================================
  // 列印回診紀錄
  //
  // 這裡是這次最重要的修正：
  // 不列印整個 CareCenter 畫面。
  //
  // @media print 時：
  // - 網頁全部隱藏
  // - 只顯示 .care-print-area
  // =====================================================

  const printMedicalRecords = () => {
    if (filteredRecords.length === 0) {
      window.alert(
        "目前沒有符合條件的照護紀錄可以列印。"
      );

      return;
    }

    window.print();
  };

  // =====================================================
  // 今日紀錄
  // =====================================================

  const todayRecords = records.filter(
    (record) =>
      record.record_date === getToday()
  );

  // =====================================================
  // 畫面
  // =====================================================

  return (
    <>
      {/* =================================================
          正常網頁
      ================================================= */}

      <div
        className="care-screen"
        style={{
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            maxWidth: "1100px",
            margin: "0 auto",
            padding: "30px",
            boxSizing: "border-box",
          }}
        >
          {/* =================================================
              頁面標題
          ================================================= */}

          <div
            style={{
              marginBottom: "28px",
            }}
          >
            <h1
              style={{
                margin: 0,
                fontSize: "32px",
                color: "#634f43",
              }}
            >
              🩺 爸爸照護
            </h1>

            <p
              style={{
                marginTop: "10px",
                color: "#927d6d",
                fontSize: "16px",
              }}
            >
              記錄每日照護狀況，方便日後查詢與回診提供醫生參考。
            </p>
          </div>

          {/* =================================================
              訊息
          ================================================= */}

          {message && (
            <div
              style={{
                marginBottom: "20px",
                padding: "12px 16px",
                borderRadius: "12px",
                background: "#f5f0eb",
                color: "#634f43",
                lineHeight: 1.6,
              }}
            >
              {message}
            </div>
          )}

          {/* =================================================
              分頁
          ================================================= */}

          <div
            className="care-tabs"
            style={{
              display: "flex",
              gap: "10px",
              marginBottom: "24px",
              borderBottom:
                "1px solid #e6ddd5",
              paddingBottom: "14px",
            }}
          >
            <button
              type="button"
              style={{
                border: "none",
                borderRadius: "10px",
                padding: "10px 18px",
                background: "#cbb797",
                color: "#fff",
                cursor: "pointer",
                fontSize: "15px",
              }}
            >
              📝 日常紀錄
            </button>

            <button
              type="button"
              onClick={() => {
                document
                  .getElementById(
                    "care-history"
                  )
                  ?.scrollIntoView({
                    behavior: "smooth",
                  });
              }}
              style={{
                border: "none",
                borderRadius: "10px",
                padding: "10px 18px",
                background: "#f4f1ed",
                color: "#634f43",
                cursor: "pointer",
                fontSize: "15px",
              }}
            >
              📊 照護歷程
            </button>
          </div>

          {/* =================================================
              今日快速狀態
          ================================================= */}

          <section
            style={{
              background: "#fff",
              borderRadius: "18px",
              padding: "24px",
              marginBottom: "24px",
              boxShadow:
                "0 4px 20px rgba(0,0,0,0.06)",
            }}
          >
            <h2
              style={{
                marginTop: 0,
                color: "#634f43",
              }}
            >
              📋 今日照護
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "14px",
              }}
            >
              <div
                style={{
                  padding: "18px",
                  background: "#faf7f3",
                  borderRadius: "14px",
                }}
              >
                <div
                  style={{
                    color: "#927d6d",
                    fontSize: "14px",
                  }}
                >
                  今日日期
                </div>

                <strong
                  style={{
                    display: "block",
                    marginTop: "6px",
                    color: "#634f43",
                    fontSize: "18px",
                  }}
                >
                  {formatDate(getToday())}
                </strong>
              </div>

              <div
                style={{
                  padding: "18px",
                  background: "#faf7f3",
                  borderRadius: "14px",
                }}
              >
                <div
                  style={{
                    color: "#927d6d",
                    fontSize: "14px",
                  }}
                >
                  今日紀錄
                </div>

                <strong
                  style={{
                    display: "block",
                    marginTop: "6px",
                    color: "#634f43",
                    fontSize: "18px",
                  }}
                >
                  {todayRecords.length} 筆
                </strong>
              </div>

              <div
                style={{
                  padding: "18px",
                  background: "#faf7f3",
                  borderRadius: "14px",
                }}
              >
                <div
                  style={{
                    color: "#927d6d",
                    fontSize: "14px",
                  }}
                >
                  全部歷程
                </div>

                <strong
                  style={{
                    display: "block",
                    marginTop: "6px",
                    color: "#634f43",
                    fontSize: "18px",
                  }}
                >
                  {records.length} 筆
                </strong>
              </div>
            </div>
          </section>

          {/* =================================================
              新增紀錄
          ================================================= */}

          <section
            style={{
              background: "#fff",
              borderRadius: "18px",
              padding: "24px",
              marginBottom: "24px",
              boxShadow:
                "0 4px 20px rgba(0,0,0,0.06)",
            }}
          >
            <h2
              style={{
                marginTop: 0,
                color: "#634f43",
              }}
            >
              ✏️ 新增照護紀錄
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "16px",
                marginBottom: "18px",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: 600,
                    color: "#634f43",
                  }}
                >
                  日期
                </label>

                <input
                  type="date"
                  value={recordDate}
                  onChange={(event) =>
                    setRecordDate(
                      event.target.value
                    )
                  }
                  style={{
                    width: "100%",
                    padding: "11px",
                    borderRadius: "10px",
                    border:
                      "1px solid #ddd",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: 600,
                    color: "#634f43",
                  }}
                >
                  紀錄分類
                </label>

                <select
                  value={category}
                  onChange={(event) =>
                    setCategory(
                      event.target
                        .value as CareCategory
                    )
                  }
                  style={{
                    width: "100%",
                    padding: "11px",
                    borderRadius: "10px",
                    border:
                      "1px solid #ddd",
                    boxSizing: "border-box",
                  }}
                >
                  {categories.map(
                    (item) => (
                      <option
                        key={item}
                        value={item}
                      >
                        {categoryEmoji[item]}{" "}
                        {item}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: 600,
                color: "#634f43",
              }}
            >
              照護內容
            </label>

            <textarea
              value={content}
              onChange={(event) =>
                setContent(
                  event.target.value
                )
              }
              placeholder="例如：今天食慾較差，早餐吃半碗粥，中午吃布丁半個；下午血氧 95%，體溫 37.0°C。"
              rows={6}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "10px",
                border: "1px solid #ddd",
                resize: "vertical",
                boxSizing: "border-box",
                fontFamily:
                  "inherit",
                fontSize: "15px",
                lineHeight: 1.7,
              }}
            />

            <button
              type="button"
              onClick={handleAddRecord}
              disabled={saving}
              style={{
                marginTop: "14px",
                padding: "11px 22px",
                border: "none",
                borderRadius: "10px",
                background: "#8d765f",
                color: "#fff",
                cursor: saving
                  ? "not-allowed"
                  : "pointer",
                fontSize: "15px",
              }}
            >
              {saving
                ? "儲存中..."
                : "＋ 儲存照護紀錄"}
            </button>
          </section>

          {/* =================================================
              照護歷程
          ================================================= */}

          <section
            id="care-history"
            style={{
              background: "#fff",
              borderRadius: "18px",
              padding: "24px",
              marginBottom: "24px",
              boxShadow:
                "0 4px 20px rgba(0,0,0,0.06)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                gap: "15px",
                flexWrap: "wrap",
                marginBottom: "20px",
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    color: "#634f43",
                  }}
                >
                  📊 照護歷程
                </h2>

                <p
                  style={{
                    margin:
                      "8px 0 0",
                    color: "#927d6d",
                  }}
                >
                  查詢爸爸過去的每日照護紀錄。
                </p>
              </div>

              <button
                type="button"
                onClick={
                  printMedicalRecords
                }
                disabled={
                  filteredRecords.length === 0
                }
                className="print-record-button"
                style={{
                  padding:
                    "10px 18px",
                  borderRadius: "10px",
                  border:
                    "1px solid #cdbda9",
                  background: "#fff",
                  color: "#634f43",
                  cursor:
                    filteredRecords.length ===
                    0
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                🖨️ 列印回診紀錄
              </button>
            </div>

            {/* =================================================
                搜尋 / 日期
            ================================================= */}

            <div
              className="care-filter-area"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "2fr 1fr 1fr",
                gap: "12px",
                marginBottom: "14px",
              }}
            >
              <input
                type="text"
                value={searchText}
                onChange={(event) =>
                  setSearchText(
                    event.target.value
                  )
                }
                placeholder="🔎 搜尋照護內容、分類或日期"
                style={{
                  width: "100%",
                  padding: "11px",
                  borderRadius: "10px",
                  border:
                    "1px solid #ddd",
                  boxSizing:
                    "border-box",
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
                  width: "100%",
                  padding: "11px",
                  borderRadius: "10px",
                  border:
                    "1px solid #ddd",
                  boxSizing:
                    "border-box",
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
                  width: "100%",
                  padding: "11px",
                  borderRadius: "10px",
                  border:
                    "1px solid #ddd",
                  boxSizing:
                    "border-box",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                marginBottom: "20px",
              }}
            >
              <button
                type="button"
                onClick={clearFilters}
                style={{
                  padding: "8px 14px",
                  borderRadius: "9px",
                  border:
                    "1px solid #ddd",
                  background: "#fff",
                  color: "#634f43",
                  cursor: "pointer",
                }}
              >
                清除篩選
              </button>

              <span
                style={{
                  alignSelf: "center",
                  color: "#927d6d",
                }}
              >
                共找到{" "}
                {filteredRecords.length}{" "}
                筆紀錄
              </span>
            </div>

            {/* =================================================
                歷程資料
            ================================================= */}

            {loading ? (
              <div
                style={{
                  padding: "30px",
                  textAlign: "center",
                  color: "#927d6d",
                }}
              >
                載入照護歷程中...
              </div>
            ) : groupedRecords.length ===
              0 ? (
              <div
                style={{
                  padding: "35px 20px",
                  textAlign: "center",
                  color: "#927d6d",
                  background: "#faf7f3",
                  borderRadius: "14px",
                }}
              >
                沒有符合條件的照護紀錄。
              </div>
            ) : (
              <div>
                {groupedRecords.map(
                  ([date, dateRecords]) => (
                    <div
                      key={date}
                      style={{
                        marginBottom:
                          "24px",
                      }}
                    >
                      <h3
                        style={{
                          margin:
                            "0 0 12px",
                          color:
                            "#634f43",
                          fontSize:
                            "19px",
                        }}
                      >
                        📅 {formatDate(date)}
                      </h3>

                      <div
                        style={{
                          display: "flex",
                          flexDirection:
                            "column",
                          gap: "10px",
                        }}
                      >
                        {dateRecords.map(
                          (record) => (
                            <div
                              key={
                                record.id
                              }
                              className="care-record-item"
                              style={{
                                padding:
                                  "16px",
                                border:
                                  "1px solid #eee4db",
                                borderRadius:
                                  "12px",
                                background:
                                  "#fffdfa",
                              }}
                            >
                              <div
                                style={{
                                  display:
                                    "flex",
                                  justifyContent:
                                    "space-between",
                                  alignItems:
                                    "flex-start",
                                  gap:
                                    "15px",
                                }}
                              >
                                <div
                                  style={{
                                    minWidth: 0,
                                    flex: 1,
                                  }}
                                >
                                  <div
                                    style={{
                                      fontWeight:
                                        600,
                                      color:
                                        "#634f43",
                                      marginBottom:
                                        "8px",
                                    }}
                                  >
                                    {
                                      categoryEmoji[
                                        record.category
                                      ]
                                    }{" "}
                                    {
                                      record.category
                                    }
                                  </div>

                                  <div
                                    style={{
                                      whiteSpace:
                                        "pre-wrap",
                                      lineHeight:
                                        1.7,
                                      color:
                                        "#594c43",
                                    }}
                                  >
                                    {
                                      record.content
                                    }
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeleteRecord(
                                      record.id
                                    )
                                  }
                                  className="care-delete-button"
                                  style={{
                                    flexShrink:
                                      0,
                                    border:
                                      "none",
                                    background:
                                      "transparent",
                                    color:
                                      "#a47d6a",
                                    cursor:
                                      "pointer",
                                    padding:
                                      "4px 6px",
                                  }}
                                >
                                  刪除
                                </button>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* =====================================================
          專門給「列印回診紀錄」使用
          
          這個區塊平常完全不顯示。
          按列印後，由 @media print 顯示。
          
          所以不會再把整個網頁畫面印出去。
      ===================================================== */}

      <div
        className="care-print-area"
        aria-hidden="true"
      >
        <div
          style={{
            fontFamily:
              '"Noto Sans TC", "Microsoft JhengHei", sans-serif',
            color: "#222",
          }}
        >
          <h1
            style={{
              marginBottom: "8px",
              fontSize: "24px",
            }}
          >
            爸爸每日照護紀錄
          </h1>

          <div
            style={{
              marginBottom: "22px",
              color: "#555",
              fontSize: "13px",
            }}
          >
            紀錄期間：
            {startDate
              ? formatDate(startDate)
              : "不限"}
            {" ～ "}
            {endDate
              ? formatDate(endDate)
              : "不限"}
          </div>

          {groupedRecords.map(
            ([date, dateRecords]) => (
              <div
                key={date}
                style={{
                  marginBottom: "22px",
                  pageBreakInside:
                    "avoid",
                }}
              >
                <h2
                  style={{
                    fontSize: "17px",
                    margin:
                      "0 0 8px",
                    paddingBottom:
                      "6px",
                    borderBottom:
                      "1px solid #999",
                  }}
                >
                  📅 {formatDate(date)}
                </h2>

                {dateRecords.map(
                  (record) => (
                    <div
                      key={
                        record.id
                      }
                      style={{
                        marginBottom:
                          "12px",
                        paddingBottom:
                          "10px",
                        borderBottom:
                          "1px solid #ddd",
                        pageBreakInside:
                          "avoid",
                      }}
                    >
                      <div
                        style={{
                          fontWeight:
                            700,
                          marginBottom:
                            "5px",
                        }}
                      >
                        {
                          categoryEmoji[
                            record.category
                          ]
                        }{" "}
                        {
                          record.category
                        }
                      </div>

                      <div
                        style={{
                          whiteSpace:
                            "pre-wrap",
                          lineHeight:
                            1.7,
                          fontSize:
                            "14px",
                        }}
                      >
                        {
                          record.content
                        }
                      </div>
                    </div>
                  )
                )}
              </div>
            )
          )}

          <div
            style={{
              marginTop: "25px",
              paddingTop: "10px",
              borderTop:
                "1px solid #999",
              fontSize: "12px",
              color: "#666",
            }}
          >
            共 {filteredRecords.length} 筆照護紀錄
          </div>
        </div>
      </div>

      {/* =====================================================
          列印 CSS
      ===================================================== */}

      <style>
        {`
          .care-print-area {
            display: none;
          }

          @media (max-width: 700px) {
            .care-filter-area {
              grid-template-columns: 1fr !important;
            }
          }

          @media print {
            @page {
              size: A4;
              margin: 15mm;
            }

            html,
            body {
              background: #fff !important;
              margin: 0 !important;
              padding: 0 !important;
            }

            body * {
              visibility: hidden !important;
            }

            .care-print-area,
            .care-print-area * {
              visibility: visible !important;
            }

            .care-print-area {
              display: block !important;
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              background: #fff !important;
              color: #222 !important;
            }

            .care-screen {
              display: none !important;
            }
          }
        `}
      </style>
    </>
  );
}

export default CareCenter;