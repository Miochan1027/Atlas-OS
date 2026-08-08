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

function App() {
  // =========================
  // 頁面
  // =========================

  const [currentPage, setCurrentPage] =
    useState<Page>("dashboard");

  // =========================
  // 登入
  // =========================

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // =========================
  // 初始化 Session
  // =========================

  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      setLoggedIn(!!session);
      setLoading(false);
    };

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;

        setLoggedIn(!!session);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // =========================
  // Sidebar 導覽
  // =========================

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent =
        event as CustomEvent<Page>;

      if (customEvent.detail) {
        setCurrentPage(customEvent.detail);
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

  // =========================
  // Email + 密碼登入
  // =========================

  const handleLogin = async (
    e: FormEvent
  ) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    const { error } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    if (error) {
      setMessage("帳號或密碼錯誤");
      setLoading(false);
      return;
    }

    // 登入成功
    setLoggedIn(true);
    setCurrentPage("dashboard");

    setPassword("");
    setMessage("");
    setLoading(false);
  };

  // =========================
  // 登出
  // =========================

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

  // =========================
  // 載入中
  // =========================

  if (loading) {
    return (
      <div
        className="atlas-login-page"
        style={{
          minHeight: "100vh",
          width: "100%",
        }}
      >
        <div className="atlas-login-card">
          <div className="atlas-login-logo">
            🦊
          </div>

          <h1>Atlas OS</h1>

          <p>
            個人管理作業系統
          </p>

          <div
            style={{
              textAlign: "center",
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

  // =========================
  // 登入畫面
  // =========================

  if (!loggedIn) {
    return (
      <div
        className="atlas-login-page"
        style={{
          minHeight: "100vh",
          width: "100%",
        }}
      >
        <div className="atlas-login-card">
          <div className="atlas-login-logo">
            🦊
          </div>

          <h1>Atlas OS</h1>

          <p>
            個人管理作業系統
          </p>

          <form onSubmit={handleLogin}>
            <label>
              Email
            </label>

            <input
              className="atlas-input"
              type="email"
              value={email}
              placeholder="輸入 Email"
              autoComplete="email"
              onChange={(e) =>
                setEmail(e.target.value)
              }
              required
            />

            <label>
              密碼
            </label>

            <input
              className="atlas-input"
              type="password"
              value={password}
              placeholder="輸入密碼"
              autoComplete="current-password"
              onChange={(e) =>
                setPassword(e.target.value)
              }
              required
            />

            <button
              className="atlas-login-button"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "登入中..."
                : "登入 Atlas OS"}
            </button>
          </form>

          {message && (
            <div className="atlas-message">
              {message}
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================
  // Atlas OS 主系統
  // =========================
  //
  // 這裡是這次真正修正的地方。
  //
  // 用 CSS Grid 強制：
  //
  // 左邊 = Sidebar 280px
  // 右邊 = 主內容剩餘空間
  //
  // 不再讓 Sidebar 把 main 往下面推。
  // 不需要修改 App.css。
  // 不需要修改 Sidebar.css。
  // =========================

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
      {/* =====================
          左側 Sidebar
         ===================== */}

      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onLogout={handleLogout}
      />

      {/* =====================
          右側主內容
         ===================== */}

      <main
        style={{
          minWidth: 0,
          width: "100%",
          minHeight: "100vh",
          boxSizing: "border-box",
          overflowX: "hidden",
        }}
      >
        <div
          className="atlas-main-inner"
          style={{
            width: "100%",
            maxWidth: "none",
            minWidth: 0,
            boxSizing: "border-box",
          }}
        >
          {currentPage === "dashboard" && (
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

          {currentPage === "schedule" && (
            <ScheduleCenter />
          )}

          {currentPage === "settings" && (
            <SettingsCenter />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;