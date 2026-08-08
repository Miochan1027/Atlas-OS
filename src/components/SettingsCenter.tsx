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


const [settings,setSettings] = useState(() => {

  const saved =
    localStorage.getItem(
      "atlas-settings"
    );


  if(!saved){
    return defaultSettings;
  }


  try{

    return {
      ...defaultSettings,
      ...JSON.parse(saved),
    };

  }catch{

    return defaultSettings;

  }

});


// =====================
// OTP MFA
// =====================

const [qrCode,setQrCode] =
useState("");

const [factorId,setFactorId] =
useState("");

const [otpCode,setOtpCode] =
useState("");

const [otpMessage,setOtpMessage] =
useState("");

const [otpLoading,setOtpLoading] =
useState(false);




// =====================
// 儲存設定
// =====================

useEffect(()=>{

  localStorage.setItem(
    "atlas-settings",
    JSON.stringify(settings)
  );

},[settings]);



const updateSetting =
(
  key: keyof Settings,
  value: Settings[keyof Settings]
)=>{

  setSettings((current: Settings)=>({

    ...current,
    [key]: value,

  }));

};




// =====================
// 啟用 OTP
// =====================

const setupOTP =
async()=>{


setOtpLoading(true);

setOtpMessage("");



const {
 data,
 error
} =
await supabase.auth.mfa.enroll({

 factorType:"totp",

});



if(error){

 setOtpMessage(
  error.message
 );

 setOtpLoading(false);

 return;

}



setFactorId(
 data.id
);


setQrCode(
 data.totp.qr_code
);


setOtpMessage(
 "請使用 Secure SignIn App 掃描 QR Code"
);


setOtpLoading(false);


};





// =====================
// 驗證 OTP
// =====================

const verifyOTP =
async()=>{


if(!factorId){

 setOtpMessage(
  "請先啟用 OTP"
 );

 return;

}



setOtpLoading(true);



const {
 data:challenge,
 error:challengeError
}
=
await supabase.auth.mfa.challenge({

 factorId,

});



if(challengeError){

 setOtpMessage(
  challengeError.message
 );

 setOtpLoading(false);

 return;

}



const {
 error
}
=
await supabase.auth.mfa.verify({

 factorId,

 challengeId:
 challenge.id,

 code:
 otpCode,

});



if(error){

 setOtpMessage(
  "OTP 驗證失敗"
 );

}else{

 setOtpMessage(
  "OTP 已啟用成功"
 );

}



setOtpLoading(false);


};





const resetSettings =
()=>{

setSettings(
 defaultSettings
);

};




const clearAllData =
()=>{


const confirmed =
window.confirm(
"確定要清除 Atlas OS 儲存的所有資料嗎？\n\n這會刪除學習、照護、股票、行程與設定資料，而且無法復原。"
);


if(!confirmed){

 return;

}


localStorage.clear();

setSettings(
 defaultSettings
);


window.location.reload();


};





return (

<section className="page-section">


<h1>
⚙️ 設定
</h1>


<p>
在這裡調整 Atlas OS 的基本設定。
</p>





{/* OTP */}

<div className="page-card">


<h2>
🔐 雙重驗證 OTP
</h2>



<p>
使用 Secure SignIn App
設定登入驗證。
</p>



<button
type="button"
onClick={setupOTP}
disabled={otpLoading}
>

{
otpLoading
?
"建立中..."
:
"啟用 OTP"
}

</button>



{
qrCode &&

<div
style={{
 marginTop:"20px"
}}
>


<p>
請使用 Secure SignIn App 掃描：
</p>


<img
src={qrCode}
alt="OTP QR Code"
style={{
 width:"220px"
}}
/>


</div>

}



<div
style={{
 marginTop:"20px"
}}
>


<input

className="atlas-input"

placeholder="輸入 6 位數 OTP"

value={otpCode}

onChange={(e)=>
 setOtpCode(
  e.target.value
 )
}

/>


<button
type="button"
onClick={verifyOTP}
>

確認 OTP

</button>


</div>



{
otpMessage &&

<p>
{otpMessage}
</p>

}



</div>






{/* 個人設定 */}

<div className="page-card">

<h2>
👤 個人設定
</h2>


<label>

<strong>
名稱：
</strong>


<input

type="text"

value={
settings.userName
}

onChange={(event)=>

updateSetting(
"userName",
event.target.value
)

}

/>


</label>



<br/>


<label>


<input

type="checkbox"

checked={
settings.showWelcome
}

onChange={(event)=>

updateSetting(
"showWelcome",
event.target.checked
)

}

/>


顯示 Dashboard 歡迎訊息


</label>


</div>







{/* 外觀 */}

<div className="page-card">


<h2>
🎨 外觀設定
</h2>



<select

value={
settings.theme
}

onChange={(event)=>

updateSetting(
"theme",
event.target.value as Settings["theme"]
)

}

>


<option value="light">
標準
</option>


<option value="soft">
柔和
</option>


</select>



</div>








{/* 股票 */}

<div className="page-card">


<h2>
📈 股票設定
</h2>


<label>

<input

type="checkbox"

checked={
settings.autoRefreshStock
}

onChange={(event)=>

updateSetting(
"autoRefreshStock",
event.target.checked
)

}

/>


自動更新股票行情


</label>


</div>







{/* 系統 */}

<div className="page-card">


<h2>
🦊 系統狀態
</h2>


<ul>

<li>
Atlas OS：運作中
</li>

<li>
Atlas AI：已啟動
</li>

<li>
OTP：可設定
</li>


</ul>


</div>







{/* 資料 */}

<div className="page-card">


<h2>
💾 資料管理
</h2>



<button
onClick={resetSettings}
>

↩️ 還原設定

</button>



<button
onClick={clearAllData}
style={{
 marginLeft:"10px"
}}
>

🗑️ 清除所有資料

</button>


</div>



</section>


);


}


export default SettingsCenter;