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
  // 登入
  // =====================

  const [email,setEmail] =
    useState("");

  const [password,setPassword] =
    useState("");

  const [otp,setOtp] =
    useState("");

  const [needOtp,setNeedOtp] =
useState(false);

const [otpVerified,setOtpVerified] =
useState(false);

  const [loggedIn,setLoggedIn] =
    useState(false);

  const [loading,setLoading] =
    useState(false);

  const [message,setMessage] =
    useState("");



  // =====================
  // 初始化
  // =====================

  useEffect(()=>{

    checkSession();


    const {
      data:{
        subscription
      }
    } =
      supabase.auth.onAuthStateChange(
  (_event,session)=>{

    if(session && !needOtp){

      setLoggedIn(true);

    }

  }
);


    return ()=>{

      subscription.unsubscribe();

    };


  },[otpVerified]);



  // =====================
  // Sidebar 導覽
  // =====================

  useEffect(()=>{


    const handler =
      (event:Event)=>{


        const custom =
          event as CustomEvent<Page>;


        if(custom.detail){

          setCurrentPage(
            custom.detail
          );

        }

      };


    window.addEventListener(
      "atlas:navigate",
      handler
    );


    return ()=>{

      window.removeEventListener(
        "atlas:navigate",
        handler
      );

    };


  },[]);



  // =====================
  // Session
  // =====================

  const checkSession =
    async()=>{

      const {
        data:{
          session
        }
      } =
      await supabase.auth.getSession();


      if(session){

        setLoggedIn(true);

      }

    };



  // =====================
  // 登入
  // =====================

 const handleLogin =
async(
e: FormEvent
)=>{

  e.preventDefault();

  setLoading(true);
  setMessage("");


  const {
    error
  } =
  await supabase.auth.signInWithPassword({

    email,
    password,

  });


  if(error){

    setMessage(
      "帳號或密碼錯誤"
    );

    setLoading(false);

    return;

  }


  // 密碼正確後，不直接進系統
  // 改進入 OTP 驗證頁

  setNeedOtp(true);

  setLoggedIn(false);

  setLoading(false);

};



  // =====================
// OTP
// =====================

const handleOtpVerify =
async(
  e: FormEvent
)=>{

  e.preventDefault();

  setNeedOtp(false);

setOtp("");

setOtpVerified(true);

setLoggedIn(true);

setCurrentPage(
"dashboard"
);

};



  // =====================
  // 登出
  // =====================

  const handleLogout =
    async()=>{


      await supabase.auth.signOut();


      setLoggedIn(false);

      setCurrentPage(
        "dashboard"
      );


      setEmail("");

      setPassword("");

      setOtp("");


    };
  // =====================
  // 登入前 OTP 畫面
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
              placeholder="000000"
              onChange={(e)=>
                setOtp(
                  e.target.value.replace(
                    /\D/g,
                    ""
                  )
                )
              }
            />


            <button
              className="atlas-login-button"
              disabled={loading}
            >

              {loading
                ? "驗證中..."
                : "驗證登入"}

            </button>


          </form>


          {
            message &&
            <div className="atlas-message">
              {message}
            </div>
          }


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
              onChange={(e)=>
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
              onChange={(e)=>
                setPassword(
                  e.target.value
                )
              }
              required
            />



            <button
              className="atlas-login-button"
              disabled={loading}
            >

              {
                loading
                ?
                "登入中..."
                :
                "登入 Atlas OS"
              }

            </button>


          </form>



          {
            message &&
            <div className="atlas-message">
              {message}
            </div>
          }



        </div>


      </div>

    );

  }



 // =====================
// 主系統
// =====================

return (

<div className="atlas-layout">


  <Sidebar
    currentPage={currentPage as Page}
    onNavigate={setCurrentPage}
    onLogout={handleLogout}
  />


  <main className="atlas-main">

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

  </main>


</div>

);
}
export default App;