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
  // 頁面
  // =====================

  const [currentPage, setCurrentPage] =
    useState<Page>("dashboard");

  // =====================
  // 登入
  // =====================

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [otp, setOtp] = useState("");

  const [loggedIn, setLoggedIn] = useState(false);
  const [needOtp, setNeedOtp] = useState(false);

  const [loading, setLoading] = useState(true);
  const [otpLoading, setOtpLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [otpMessage, setOtpMessage] = useState("");

  // =====================
  // OTP 驗證狀態
  // =====================

  const OTP_SESSION_KEY = "atlas_otp_verified";

  // =====================
  // 初始化 Session
  // =====================

  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      const otpVerified =
        sessionStorage.getItem(OTP_SESSION_KEY) === "1";

      if (session && otpVerified) {
        // 已登入 + 本次瀏覽階段已完成 OTP
        setLoggedIn(true);
        setNeedOtp(false);
      } else if (session && !otpVerified) {
        // 有 Supabase Session，
        // 但尚未完成 OTP
        setLoggedIn(false);
        setNeedOtp(true);
      } else {
        // 完全沒有登入
        setLoggedIn(false);
        setNeedOtp(false);
      }

      setLoading(false);
    };

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;

        const otpVerified =
          sessionStorage.getItem(OTP_SESSION_KEY) === "1";

        if (session && otpVerified) {
          setLoggedIn(true);
          setNeedOtp(false);
        } else if (session && !otpVerified) {
          setLoggedIn(false);
          setNeedOtp(true);
        } else {
          setLoggedIn(false);
          setNeedOtp(false);
        }
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

  // =====================
  // Email + 密碼登入
  // =====================

  const handleLogin = async (
    e: FormEvent
  ) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    // 每次重新登入，
    // 都必須重新完成 OTP
    sessionStorage.removeItem(
      OTP_SESSION_KEY
    );

    const {
      data,
      error,
    } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    if (error || !data.session) {
      setMessage("帳號或密碼錯誤");
      setLoading(false);
      return;
    }

    // 密碼正確
    // 不直接進入 Atlas OS
    // 必須先進 OTP
    setLoggedIn(false);
    setNeedOtp(true);

    setOtp("");
    setOtpMessage("");

    setLoading(false);
  };

  // =====================
  // OTP 驗證
  // =====================

  const handleOtpVerify = async (
    e: FormEvent
  ) => {
    e.preventDefault();

    const code = otp.trim();

    // 基本檢查
    if (!/^\d{6}$/.test(code)) {
      setOtpMessage(
        "請輸入 6 位數 OTP 驗證碼"
      );
      return;
    }

    setOtpLoading(true);
    setOtpMessage("");

    try {
      // 呼叫 Supabase Edge Function
      //
      // 注意：
      // atlas-otp 要的是 code
      // 不是 otp
      const {
        data,
        error,
      } =
        await supabase.functions.invoke(
          "atlas-otp",
          {
            body: {
              action: "verify",
              code,
            },
          }
        );

      if (error) {
        console.error(
          "atlas-otp error:",
          error
        );

        setOtpMessage(
          "OTP 驗證失敗，請稍後再試"
        );

        setOtpLoading(false);
        return;
      }

      // Edge Function 回傳：
      // { success: true, verified: true }
      if (
        !data ||
        data.success !== true ||
        data.verified !== true
      ) {
        setOtpMessage(
          data?.message ||
            "OTP 驗證碼錯誤"
        );

        setOtpLoading(false);
        return;
      }

      // =====================
      // OTP 成功
      // =====================

      sessionStorage.setItem(
        OTP_SESSION_KEY,
        "1"
      );

      setOtp("");
      setOtpMessage("");

      setNeedOtp(false);
      setLoggedIn(true);
      setCurrentPage("dashboard");

      setOtpLoading(false);
    } catch (error) {
      console.error(
        "OTP verification exception:",
        error
      );

      setOtpMessage(
        "OTP 驗證發生錯誤，請稍後再試"
      );

      setOtpLoading(false);
    }
  };

  // =====================
  // 登出
  // =====================

  const handleLogout = async () => {
    setLoading(true);

    await supabase.auth.signOut();

    // 登出後清除 OTP 驗證狀態
    sessionStorage.removeItem(
      OTP_SESSION_KEY
    );

    setLoggedIn(false);
    setNeedOtp(false);

    setCurrentPage("dashboard");

    setEmail("");
    setPassword("");
    setOtp("");

    setMessage("");
    setOtpMessage("");

    setLoading(false);
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

  // =====================
  // OTP 驗證畫面
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

            <label>
              驗證碼
            </label>

            <input
              className="atlas-input"
              type="text"
              value={otp}
              maxLength={6}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              onChange={(e) => {
                setOtp(
                  e.target.value.replace(
                    /\D/g,
                    ""
                  )
                );
              }}
              required
            />

            <button
              className="atlas-login-button"
              type="submit"
              disabled={otpLoading}
            >
              {otpLoading
                ? "驗證中..."
                : "驗證登入"}
            </button>

          </form>

          {otpMessage && (
            <div className="atlas-message">
              {otpMessage}
            </div>
          )}

        </div>

      </div>
    );
  }

  // =====================
  // Email + 密碼登入畫面
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

  // =====================
  // 主系統
  //
  // 這裡刻意不增加
  // margin-left / width / main
  // 等版面控制。
  //
  // 直接沿用原本 App.css
  // + Sidebar.css 的版面。
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