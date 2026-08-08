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
  const [currentPage, setCurrentPage] =
    useState<Page>("dashboard");

  // =====================
  // 登入資料
  // =====================

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [otp, setOtp] =
    useState("");

  // =====================
  // 狀態
  // =====================

  const [needOtp, setNeedOtp] =
    useState(false);

  const [loggedIn, setLoggedIn] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  // =====================
  // 初始化 Session
  // =====================

  useEffect(() => {
    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          setLoggedIn(false);
          setNeedOtp(false);
          return;
        }

        // 只有完成 OTP 驗證後才進入系統
        const otpPassed =
          sessionStorage.getItem(
            "atlas_otp_verified"
          ) === "true";

        if (otpPassed) {
          setLoggedIn(true);
          setNeedOtp(false);
        }
      }
    );

    return () => {
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
  // Session 檢查
  // =====================

  const checkSession = async () => {
    const {
      data: { session },
    } =
      await supabase.auth.getSession();

    if (!session) {
      setLoggedIn(false);
      return;
    }

    const otpPassed =
      sessionStorage.getItem(
        "atlas_otp_verified"
      ) === "true";

    if (otpPassed) {
      setLoggedIn(true);
      setNeedOtp(false);
    } else {
      // 有 Supabase Session，但尚未完成 Atlas OTP
      setLoggedIn(false);
      setNeedOtp(true);
    }
  };

  // =====================
  // Email + 密碼登入
  // =====================

  const handleLogin = async (
    e: FormEvent
  ) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    // 清除上一個登入狀態
    sessionStorage.removeItem(
      "atlas_otp_verified"
    );

    const {
      error,
    } =
      await supabase.auth.signInWithPassword({
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

    // 密碼正確
    // 不直接進 Atlas
    // 進入 OTP 驗證頁

    setNeedOtp(true);
    setLoggedIn(false);
    setOtp("");
    setLoading(false);
  };

  // =====================
  // OTP 驗證
  // =====================

  const handleOtpVerify = async (
    e: FormEvent
  ) => {
    e.preventDefault();

    if (otp.length !== 6) {
      setMessage(
        "請輸入 6 位數驗證碼"
      );
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      // 呼叫 Supabase Edge Function
      const {
        data,
        error,
      } =
        await supabase.functions.invoke(
          "atlas-otp",
          {
            body: {
              action: "verify",
              otp,
            },
          }
        );

      if (error) {
        throw error;
      }

      if (
        !data ||
        data.success !== true
      ) {
        setMessage(
          data?.message ||
            "驗證碼錯誤，請重新輸入"
        );

        setOtp("");
        setLoading(false);
        return;
      }

      // =====================
      // OTP 驗證成功
      // =====================

      sessionStorage.setItem(
        "atlas_otp_verified",
        "true"
      );

      setNeedOtp(false);
      setLoggedIn(true);
      setOtp("");
      setCurrentPage("dashboard");
      setMessage("");

    } catch (error) {
      console.error(
        "OTP verification error:",
        error
      );

      setMessage(
        "OTP 驗證服務暫時無法使用，請稍後再試"
      );

      setOtp("");
    }

    setLoading(false);
  };

  // =====================
  // 登出
  // =====================

  const handleLogout = async () => {
    await supabase.auth.signOut();

    sessionStorage.removeItem(
      "atlas_otp_verified"
    );

    setLoggedIn(false);
    setNeedOtp(false);
    setCurrentPage("dashboard");

    setEmail("");
    setPassword("");
    setOtp("");
    setMessage("");
  };

  // =====================
  // OTP 畫面
  // =====================

  if (needOtp && !loggedIn) {
    return (
      <div className="atlas-login-page">
        <div className="atlas-login-card">

          <div className="atlas-login-logo">
            🔐
          </div>

          <h1>
            OTP 驗證
          </h1>

          <p>
            請開啟你的 Authenticator
            <br />
            輸入 6 位數驗證碼
          </p>

          <form
            onSubmit={handleOtpVerify}
          >

            <input
              className="atlas-input"
              value={otp}
              maxLength={6}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              onChange={(e) =>
                setOtp(
                  e.target.value.replace(
                    /\D/g,
                    ""
                  )
                )
              }
              required
            />

            <button
              className="atlas-login-button"
              type="submit"
              disabled={
                loading ||
                otp.length !== 6
              }
            >
              {loading
                ? "驗證中..."
                : "驗證登入"}
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
                setEmail(
                  e.target.value
                )
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