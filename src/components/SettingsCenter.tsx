import {
  useEffect,
  useState,
} from "react";

import { supabase } from "../lib/supabase";

type Settings = {
  userName: string;
  theme: "light" | "soft";
  showWelcome: boolean;
  autoRefreshStock: boolean;
};

const defaultSettings: Settings = {
  userName: "Mio",
  theme: "light",
  showWelcome: true,
  autoRefreshStock: true,
};

function SettingsCenter() {
  // =====================================================
  // 個人設定
  // =====================================================

  const [settings, setSettings] =
    useState<Settings>(() => {
      const saved =
        localStorage.getItem(
          "atlas-settings"
        );

      if (!saved) {
        return defaultSettings;
      }

      try {
        return {
          ...defaultSettings,
          ...JSON.parse(saved),
        };
      } catch {
        return defaultSettings;
      }
    });

  // =====================================================
  // 密碼修改
  // =====================================================

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [passwordMessage, setPasswordMessage] =
    useState("");

  const [passwordLoading, setPasswordLoading] =
    useState(false);

  // =====================================================
  // 儲存設定
  // =====================================================

  useEffect(() => {
    localStorage.setItem(
      "atlas-settings",
      JSON.stringify(settings)
    );
  }, [settings]);

  // =====================================================
  // 更新設定
  // =====================================================

  const updateSetting = <
    K extends keyof Settings
  >(
    key: K,
    value: Settings[K]
  ) => {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  };

  // =====================================================
  // 修改目前帳號密碼
  // =====================================================

  const handleChangePassword =
    async () => {
      setPasswordMessage("");

      if (!newPassword) {
        setPasswordMessage(
          "請輸入新密碼。"
        );
        return;
      }

      if (newPassword.length < 6) {
        setPasswordMessage(
          "新密碼至少需要 6 個字元。"
        );
        return;
      }

      if (
        newPassword !==
        confirmPassword
      ) {
        setPasswordMessage(
          "兩次輸入的新密碼不一致。"
        );
        return;
      }

      setPasswordLoading(true);

      try {
        const {
          error,
        } =
          await supabase.auth.updateUser({
            password: newPassword,
          });

        if (error) {
          console.error(
            "Change password error:",
            error
          );

          setPasswordMessage(
            `密碼修改失敗：${error.message}`
          );

          return;
        }

        setPasswordMessage(
          "✅ 密碼已成功修改。"
        );

        setNewPassword("");
        setConfirmPassword("");
      } catch (error) {
        console.error(
          "Change password exception:",
          error
        );

        setPasswordMessage(
          "修改密碼時發生錯誤，請稍後再試。"
        );
      } finally {
        setPasswordLoading(false);
      }
    };

  // =====================================================
  // 還原設定
  // =====================================================

  const resetSettings = () => {
    setSettings(defaultSettings);
  };

  // =====================================================
  // 清除所有資料
  // =====================================================

  const clearAllData = () => {
    const confirmed =
      window.confirm(
        "確定要清除 Atlas OS 儲存的所有資料嗎？\n\n這會刪除學習、照護、股票、行程與設定資料，而且無法復原。"
      );

    if (!confirmed) {
      return;
    }

    localStorage.clear();

    setSettings(defaultSettings);

    window.location.reload();
  };

  // =====================================================
  // 畫面
  // =====================================================

  return (
    <div
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        padding: "30px",
      }}
    >
      {/* =================================================
          帳號安全
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
        <h2>🔐 帳號安全</h2>

        <p
          style={{
            color: "#666",
            lineHeight: 1.7,
          }}
        >
          管理你的 Atlas OS 帳號密碼。
        </p>

        <div
          style={{
            marginTop: "20px",
            padding: "18px",
            borderRadius: "12px",
            background: "#f8f5f2",
          }}
        >
          <div
            style={{
              fontWeight: 600,
              marginBottom: "14px",
            }}
          >
            🔑 修改密碼
          </div>

          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: 600,
            }}
          >
            新密碼
          </label>

          <input
            className="atlas-input"
            type="password"
            value={newPassword}
            placeholder="輸入新密碼"
            autoComplete="new-password"
            onChange={(event) =>
              setNewPassword(
                event.target.value
              )
            }
            style={{
              width: "100%",
              maxWidth: "360px",
              boxSizing: "border-box",
            }}
          />

          <label
            style={{
              display: "block",
              marginTop: "14px",
              marginBottom: "8px",
              fontWeight: 600,
            }}
          >
            確認新密碼
          </label>

          <input
            className="atlas-input"
            type="password"
            value={confirmPassword}
            placeholder="再次輸入新密碼"
            autoComplete="new-password"
            onChange={(event) =>
              setConfirmPassword(
                event.target.value
              )
            }
            style={{
              width: "100%",
              maxWidth: "360px",
              boxSizing: "border-box",
            }}
          />

          <button
            type="button"
            onClick={
              handleChangePassword
            }
            disabled={passwordLoading}
            style={{
              marginTop: "14px",
              padding: "10px 18px",
              border: "none",
              borderRadius: "10px",
              cursor:
                passwordLoading
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {passwordLoading
              ? "修改中..."
              : "修改密碼"}
          </button>

          {passwordMessage && (
            <div
              style={{
                marginTop: "14px",
                padding:
                  "12px 16px",
                borderRadius: "10px",
                background:
                  "#f5f0eb",
                color: "#634f43",
                lineHeight: 1.6,
              }}
            >
              {passwordMessage}
            </div>
          )}
        </div>
      </section>

      {/* =================================================
          個人設定
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
        <h2>👤 個人設定</h2>

        <div
          style={{
            marginBottom: "18px",
          }}
        >
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: 600,
            }}
          >
            使用者名稱
          </label>

          <input
            type="text"
            value={settings.userName}
            onChange={(event) =>
              updateSetting(
                "userName",
                event.target.value
              )
            }
            style={{
              width: "100%",
              maxWidth: "360px",
              padding: "10px",
              borderRadius: "10px",
              border:
                "1px solid #ddd",
              boxSizing:
                "border-box",
            }}
          />
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <input
            type="checkbox"
            checked={
              settings.showWelcome
            }
            onChange={(event) =>
              updateSetting(
                "showWelcome",
                event.target.checked
              )
            }
          />

          顯示 Dashboard 歡迎訊息
        </label>
      </section>

      {/* =================================================
          外觀
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
        <h2>🎨 外觀</h2>

        <label
          style={{
            display: "block",
            marginBottom: "8px",
            fontWeight: 600,
          }}
        >
          主題
        </label>

        <select
          value={settings.theme}
          onChange={(event) =>
            updateSetting(
              "theme",
              event.target
                .value as Settings["theme"]
            )
          }
          style={{
            padding: "10px",
            borderRadius: "10px",
            border:
              "1px solid #ddd",
          }}
        >
          <option value="light">
            Light
          </option>

          <option value="soft">
            Soft
          </option>
        </select>
      </section>

      {/* =================================================
          股票
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
        <h2>📈 股票</h2>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <input
            type="checkbox"
            checked={
              settings.autoRefreshStock
            }
            onChange={(event) =>
              updateSetting(
                "autoRefreshStock",
                event.target.checked
              )
            }
          />

          自動更新股票行情
        </label>
      </section>

      {/* =================================================
          系統
      ================================================= */}

      <section
        style={{
          background: "#fff",
          borderRadius: "18px",
          padding: "24px",
          boxShadow:
            "0 4px 20px rgba(0,0,0,0.06)",
        }}
      >
        <h2>⚙️ 系統</h2>

        <button
          type="button"
          onClick={resetSettings}
          style={{
            padding: "10px 18px",
            borderRadius: "10px",
            border:
              "1px solid #ddd",
            cursor: "pointer",
          }}
        >
          ↩️ 還原設定
        </button>

        <button
          type="button"
          onClick={clearAllData}
          style={{
            marginLeft: "10px",
            padding: "10px 18px",
            borderRadius: "10px",
            border:
              "1px solid #ddd",
            cursor: "pointer",
          }}
        >
          🗑️ 清除所有資料
        </button>
      </section>
    </div>
  );
}

export default SettingsCenter;