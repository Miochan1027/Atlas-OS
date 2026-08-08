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
  // =====================
  // 系統頁面
  // =====================

  const [currentPage, setCurrentPage] =
    useState<Page>("dashboard");

  // =====================
  // 登入狀態
  // =====================

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loggedIn, setLoggedIn] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  // =====================
  // 初始化 Session
  // =====================

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      setLoggedIn(!!session);
      setLoading(false);
    };

    checkSession();

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

  // =====================
  // Sidebar 導覽
  // =====================

  useEffect(() => {
    const handler = (event: Event) => {
      const custom =
        event as CustomEvent<Page>;

      if (custom.detail) {
        setCurrentPage(custom.detail);
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

  // =====================
  // 登入
  // =====================

  const handleLogin = async (
    e: FormEvent
  ) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    const {
      error,
    } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(
        "帳號或密碼錯誤"
      );

      setLoading(false);
      return;
    }

    // Supabase 登入成功
    // 不再進入任何自製 OTP 畫面
    setLoggedIn(true);
    setCurrentPage("dashboard");

    setLoading(false);
  };

  // =====================
  // 登出
  // =====================

  const handleLogout = async () => {
    await supabase.auth.signOut();

    setLoggedIn(false);
    setCurrentPage("dashboard");

    setEmail("");
    setPassword("");
    setMessage("");
  };

  // =====================
  // 初始化載入
  // =====================

  if (loading) {
    return (
      <div className="atlas-login-page">
        <div className="atlas-login-card">
          <div className="atlas-login-logo">
            🦊
          </div>

          <h1>Atlas OS</h1>

          <p>
            正在確認登入狀態...
          </p>
        </div>
      </div>
    );
  }

  // =====================
  // 登入畫面
  // =====================

  if (!loggedIn) {
    return (
      <div className="atlas-login-page">
        <div className="atlas-login-card">

          <div className="atlas-login-logo">
            🦊
          </div>

          <h1>
            Atlas OS
          </h1>

          <p>
            個人管理作業系統
          </p>

          <form
            onSubmit={handleLogin}
          >

            <label>
              Email
            </label>

            <input
              className="atlas-input"
              type="email"
              value={email}
              placeholder="輸入 Email"
              onChange={(e) =>
                setEmail(e.target.value)
              }
              required
              autoComplete="email"
            />

            <label>
              密碼
            </label>

            <input
              className="atlas-input"
              type="password"
              value={password}
              placeholder="輸入密碼"
              onChange={(e) =>
                setPassword(e.target.value)
              }
              required
              autoComplete="current-password"
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

  // =====================
  // Atlas OS 主系統
  // =====================

  return (
    <>
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onLogout={handleLogout}
      />

      <div className="atlas-main-inner">

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
    </>
  );
}

export default App;