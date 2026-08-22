import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import { supabase } from "./lib/supabase";

import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import StudyCenter from "./components/StudyCenter";
import CareCenter from "./components/CareCenter";
import StockCenter from "./components/StockCenter";
import ScheduleCenter from "./components/ScheduleCenter";
import SettingsCenter from "./components/SettingsCenter";

import "./App.css";

type Page =
  | "dashboard"
  | "study"
  | "care"
  | "stock"
  | "schedule"
  | "settings";

// =====================================================
// Atlas OS 正式網站網址
// =====================================================

const PRODUCTION_URL =
  "https://atlas-os-sooty-six.vercel.app/";

function App() {
  // =====================================================
  // 頁面
  // =====================================================

  const [currentPage, setCurrentPage] =
    useState<Page>("dashboard");

  // =====================================================
  // 登入
  // =====================================================

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // =====================================================
  // 忘記密碼
  // =====================================================

  const [forgotPasswordMode, setForgotPasswordMode] =
    useState(false);

  const [resetEmail, setResetEmail] =
    useState("");

  const [resetMessage, setResetMessage] =
    useState("");

  const [resetLoading, setResetLoading] =
    useState(false);

  // =====================================================
  // 重設密碼
  // =====================================================

  const [passwordRecoveryMode, setPasswordRecoveryMode] =
    useState(false);

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [passwordResetMessage, setPasswordResetMessage] =
    useState("");

  const [passwordResetLoading, setPasswordResetLoading] =
    useState(false);

  // =====================================================
  // 判斷目前是不是 Supabase 密碼重設連結
  //
  // Supabase 的 recovery link 會帶：
  //
  // #access_token=...
  // #refresh_token=...
  // #type=recovery
  //
  // =====================================================

  const isPasswordRecoveryUrl = () => {
    const hash =
      window.location.hash || "";

    const search =
      window.location.search || "";

    return (
      hash.includes("type=recovery") ||
      search.includes("type=recovery")
    );
  };

  // =====================================================
  // 初始化 Session
  //
  // 注意：
  // 這裡完全不檢查 MFA / AAL。
  // 有 Session 就直接視為登入。
  // =====================================================

  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      // -------------------------------------------------
      // 如果使用者是從「忘記密碼」Email 點進來，
      // 直接進入設定新密碼畫面。
      // -------------------------------------------------

      if (isPasswordRecoveryUrl()) {
        if (!mounted) {
          return;
        }

        setPasswordRecoveryMode(true);
        setForgotPasswordMode(false);
        setLoggedIn(false);
        setLoading(false);

        return;
      }

      // -------------------------------------------------
      // 一般 Session
      // -------------------------------------------------

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      setLoggedIn(!!session);
      setLoading(false);
    };

    initSession();

    // ===================================================
    // 監聽 Supabase Auth 狀態
    // ===================================================

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) {
          return;
        }

        console.log(
          "Supabase Auth event:",
          event
        );

        // -------------------------------------------------
        // 密碼重設
        // -------------------------------------------------

        if (
          event === "PASSWORD_RECOVERY"
        ) {
          setPasswordRecoveryMode(true);
          setForgotPasswordMode(false);
          setLoggedIn(false);
          setLoading(false);

          return;
        }

        // -------------------------------------------------
        // 一般登入 / 登出
        //
        // 不檢查 MFA
        // 不檢查 AAL
        // -------------------------------------------------

        setLoggedIn(!!session);
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // =====================================================
  // Sidebar 導覽
  // =====================================================

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent =
        event as CustomEvent<Page>;

      if (customEvent.detail) {
        setCurrentPage(
          customEvent.detail
        );
      }
    };

    window.addEventListener(
      "atlas:navigate",
      handler
    );

    return () => {
      window.removeEventListener(
        "atlas:navigate",
        handler
      );
    };
  }, []);

  // =====================================================
  // Email + 密碼登入
  // =====================================================

  const handleLogin = async (
    e: FormEvent
  ) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    const {
      error,
    } =
      await supabase.auth.signInWithPassword(
        {
          email: email.trim(),
          password,
        }
      );

    if (error) {
      console.error(
        "Login error:",
        error
      );

      setMessage(
        "帳號或密碼錯誤，請重新確認。"
      );

      setLoading(false);

      return;
    }

    // -------------------------------------------------
    // 登入成功
    // -------------------------------------------------

    setLoggedIn(true);
    setCurrentPage("dashboard");

    setPassword("");
    setMessage("");

    setLoading(false);
  };

  // =====================================================
  // 忘記密碼：寄送重設信
  //
  // 重要：
  // 不使用 window.location.origin。
  //
  // 直接指定 Atlas OS 正式網址，
  // 避免重設信導向 localhost。
  // =====================================================

  const handleForgotPassword = async (
    e: FormEvent
  ) => {
    e.preventDefault();

    const targetEmail =
      resetEmail.trim();

    if (!targetEmail) {
      setResetMessage(
        "請先輸入你的 Email。"
      );

      return;
    }

    setResetLoading(true);
    setResetMessage("");

    try {
      const {
        error,
      } =
        await supabase.auth.resetPasswordForEmail(
          targetEmail,
          {
            redirectTo:
              PRODUCTION_URL,
          }
        );

      if (error) {
        console.error(
          "Reset password error:",
          error
        );

        setResetMessage(
          `寄送失敗：${error.message}`
        );

        return;
      }

      setResetMessage(
        "✅ 密碼重設信已寄出！請到你的 Email 收信，點擊信件中的重設連結。"
      );
    } catch (error) {
      console.error(
        "Reset password exception:",
        error
      );

      setResetMessage(
        "寄送重設信時發生錯誤，請稍後再試。"
      );
    } finally {
      setResetLoading(false);
    }
  };

  // =====================================================
  // 更新新密碼
  // =====================================================

  const handleUpdatePassword = async (
    e: FormEvent
  ) => {
    e.preventDefault();

    setPasswordResetMessage("");

    // -------------------------------------------------
    // 密碼長度
    // -------------------------------------------------

    if (newPassword.length < 6) {
      setPasswordResetMessage(
        "新密碼至少需要 6 個字元。"
      );

      return;
    }

    // -------------------------------------------------
    // 確認密碼
    // -------------------------------------------------

    if (
      newPassword !==
      confirmPassword
    ) {
      setPasswordResetMessage(
        "兩次輸入的新密碼不一致。"
      );

      return;
    }

    setPasswordResetLoading(true);

    try {
      // -------------------------------------------------
      // Supabase 更新密碼
      // -------------------------------------------------

      const {
        error,
      } =
        await supabase.auth.updateUser({
          password: newPassword,
        });

      if (error) {
        console.error(
          "Update password error:",
          error
        );

        setPasswordResetMessage(
          `密碼更新失敗：${error.message}`
        );

        return;
      }

      // -------------------------------------------------
      // 成功
      // -------------------------------------------------

      setPasswordResetMessage(
        "✅ 密碼已成功更新！"
      );

      setNewPassword("");
      setConfirmPassword("");

      // -------------------------------------------------
      // 稍微停留一下讓使用者看到成功訊息，
      // 然後回到 Atlas OS。
      // -------------------------------------------------

      setTimeout(() => {
        setPasswordRecoveryMode(false);
        setLoggedIn(true);
        setCurrentPage("dashboard");

        // 清除 recovery URL 裡面的 token/hash
        window.history.replaceState(
          {},
          document.title,
          PRODUCTION_URL
        );
      }, 1000);
    } catch (error) {
      console.error(
        "Update password exception:",
        error
      );

      setPasswordResetMessage(
        "更新密碼時發生錯誤，請稍後再試。"
      );
    } finally {
      setPasswordResetLoading(false);
    }
  };

  // =====================================================
  // 登出
  // =====================================================

  const handleLogout = async () => {
    setLoading(true);

    await supabase.auth.signOut();

    setLoggedIn(false);
    setCurrentPage("dashboard");

    setEmail("");
    setPassword("");
    setMessage("");

    setLoading(false);
  };

  // =====================================================
  // 初始載入
  // =====================================================

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f7f2ed",
        }}
      >
        <div
          style={{
            width: "360px",
            padding: "40px",
            background: "#fff",
            borderRadius: "20px",
            boxShadow:
              "0 8px 30px rgba(0,0,0,0.08)",
            textAlign: "center",
          }}
        >
          <div
            className="atlas-login-logo"
            style={{
              fontSize: "48px",
              marginBottom: "12px",
            }}
          >
            🦊
          </div>

          <h1>
            Atlas OS
          </h1>

          <p>
            個人管理作業系統
          </p>

          <div
            style={{
              marginTop: "24px",
              color: "#927d6d",
            }}
          >
            載入中...
          </div>
        </div>
      </div>
    );
  }

  // =====================================================
  // 密碼重設畫面
  // =====================================================

  if (passwordRecoveryMode) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f7f2ed",
          padding: "20px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "420px",
            padding: "40px",
            background: "#fff",
            borderRadius: "20px",
            boxShadow:
              "0 8px 30px rgba(0,0,0,0.08)",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              textAlign: "center",
              fontSize: "48px",
              marginBottom: "10px",
            }}
          >
            🔑
          </div>

          <h1
            style={{
              textAlign: "center",
              marginBottom: "10px",
            }}
          >
            設定新密碼
          </h1>

          <p
            style={{
              textAlign: "center",
              color: "#777",
              lineHeight: 1.7,
              marginBottom: "28px",
            }}
          >
            請輸入你的新密碼。
          </p>

          <form
            onSubmit={
              handleUpdatePassword
            }
          >
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
              onChange={(e) =>
                setNewPassword(
                  e.target.value
                )
              }
              required
            />

            <label
              style={{
                display: "block",
                marginTop: "18px",
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
              onChange={(e) =>
                setConfirmPassword(
                  e.target.value
                )
              }
              required
            />

            <button
              className="atlas-login-button"
              type="submit"
              disabled={
                passwordResetLoading
              }
              style={{
                marginTop: "22px",
                width: "100%",
              }}
            >
              {passwordResetLoading
                ? "更新中..."
                : "更新密碼"}
            </button>
          </form>

          {passwordResetMessage && (
            <div
              className="atlas-message"
              style={{
                marginTop: "18px",
                lineHeight: 1.7,
              }}
            >
              {
                passwordResetMessage
              }
            </div>
          )}
        </div>
      </div>
    );
  }

  // =====================================================
  // 忘記密碼畫面
  // =====================================================

  if (forgotPasswordMode) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f7f2ed",
          padding: "20px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "420px",
            padding: "40px",
            background: "#fff",
            borderRadius: "20px",
            boxShadow:
              "0 8px 30px rgba(0,0,0,0.08)",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              textAlign: "center",
              fontSize: "48px",
              marginBottom: "10px",
            }}
          >
            🔐
          </div>

          <h1
            style={{
              textAlign: "center",
              marginBottom: "10px",
            }}
          >
            忘記密碼
          </h1>

          <p
            style={{
              textAlign: "center",
              color: "#777",
              lineHeight: 1.7,
              marginBottom: "28px",
            }}
          >
            輸入你的帳號 Email，
            <br />
            我們會寄送密碼重設連結給你。
          </p>

          <form
            onSubmit={
              handleForgotPassword
            }
          >
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: 600,
              }}
            >
              Email
            </label>

            <input
              className="atlas-input"
              type="email"
              value={resetEmail}
              placeholder="輸入 Email"
              autoComplete="email"
              onChange={(e) =>
                setResetEmail(
                  e.target.value
                )
              }
              required
            />

            <button
              className="atlas-login-button"
              type="submit"
              disabled={resetLoading}
              style={{
                marginTop: "20px",
                width: "100%",
              }}
            >
              {resetLoading
                ? "寄送中..."
                : "寄送重設密碼信"}
            </button>
          </form>

          {resetMessage && (
            <div
              className="atlas-message"
              style={{
                marginTop: "18px",
                lineHeight: 1.7,
              }}
            >
              {resetMessage}
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setForgotPasswordMode(
                false
              );

              setResetMessage("");
            }}
            style={{
              display: "block",
              width: "100%",
              marginTop: "20px",
              padding: "10px",
              border: "none",
              background:
                "transparent",
              color: "#927d6d",
              cursor: "pointer",
            }}
          >
            ← 返回登入
          </button>
        </div>
      </div>
    );
  }

  // =====================================================
  // 登入畫面
  // =====================================================

  if (!loggedIn) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f7f2ed",
          padding: "20px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "420px",
            padding: "40px",
            background: "#fff",
            borderRadius: "20px",
            boxShadow:
              "0 8px 30px rgba(0,0,0,0.08)",
            boxSizing: "border-box",
          }}
        >
          <div
            className="atlas-login-logo"
            style={{
              textAlign: "center",
              fontSize: "48px",
              marginBottom: "10px",
            }}
          >
            🦊
          </div>

          <h1
            style={{
              textAlign: "center",
            }}
          >
            Atlas OS
          </h1>

          <p
            style={{
              textAlign: "center",
              color: "#777",
              marginBottom: "28px",
            }}
          >
            個人管理作業系統
          </p>

          <form
            onSubmit={handleLogin}
          >
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: 600,
              }}
            >
              Email
            </label>

            <input
              className="atlas-input"
              type="email"
              value={email}
              placeholder="輸入 Email"
              autoComplete="email"
              onChange={(e) =>
                setEmail(
                  e.target.value
                )
              }
              required
            />

            <label
              style={{
                display: "block",
                marginTop: "18px",
                marginBottom: "8px",
                fontWeight: 600,
              }}
            >
              密碼
            </label>

            <input
              className="atlas-input"
              type="password"
              value={password}
              placeholder="輸入密碼"
              autoComplete="current-password"
              onChange={(e) =>
                setPassword(
                  e.target.value
                )
              }
              required
            />

            <button
              className="atlas-login-button"
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                marginTop: "20px",
              }}
            >
              {loading
                ? "登入中..."
                : "登入 Atlas OS"}
            </button>
          </form>

          {/* =================================================
              忘記密碼
          ================================================= */}

          <button
            type="button"
            onClick={() => {
              setForgotPasswordMode(
                true
              );

              setResetEmail(email);
              setMessage("");
            }}
            style={{
              display: "block",
              width: "100%",
              marginTop: "18px",
              padding: "10px",
              border: "none",
              background:
                "transparent",
              color: "#927d6d",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            忘記密碼？
          </button>

          {message && (
            <div
              className="atlas-message"
              style={{
                marginTop: "10px",
              }}
            >
              {message}
            </div>
          )}
        </div>
      </div>
    );
  }

  // =====================================================
  // 主系統
  // =====================================================

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "280px minmax(0, 1fr)",
        minHeight: "100vh",
        width: "100%",
        margin: 0,
        padding: 0,
      }}
    >
      {/* =================================================
          左側 Sidebar
      ================================================= */}

      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onLogout={handleLogout}
      />

      {/* =================================================
          右側主內容
      ================================================= */}

      <main
        style={{
          gridColumn: "2",
          minWidth: 0,
          width: "100%",
          minHeight: "100vh",
          margin: 0,
          padding: 0,
          boxSizing: "border-box",
          position: "relative",
          overflowX: "hidden",
        }}
      >
        <div
          className="atlas-main-inner"
          style={{
            width: "100%",
            minWidth: 0,
            maxWidth: "none",
            margin: 0,
            boxSizing: "border-box",
            position: "relative",
          }}
        >
          {currentPage ===
            "dashboard" && (
            <Dashboard />
          )}

          {currentPage === "study" && (
            <StudyCenter />
          )}

          {currentPage === "care" && (
            <CareCenter />
          )}

          {currentPage === "stock" && (
            <StockCenter />
          )}

          {currentPage ===
            "schedule" && (
            <ScheduleCenter />
          )}

          {currentPage ===
            "settings" && (
            <SettingsCenter />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;