import React, { useEffect, useMemo, useState } from "react";

// 页面（pages）
import Home from "./pages/Home";
import HostMenu from "./pages/HostMenu";
import HostConference from "./pages/HostConference";
import HostConferenceDesigner from "./pages/HostConferenceDesigner";
import HostTrade from "./pages/HostTrade";
import HostTradeDesigner from "./pages/HostTradeDesigner";
import AttendeePage from "./pages/AttendeePage";

// 组件（components）
import LoginHost from "./components/LoginHost";
import JoinAttendee from "./components/JoinAttendee";

// 本地存储（lib）
import { currentUser, ensureConferenceId, getMeeting } from "./lib/store";

export default function App() {
  const [view, setView] = useState("home");
  const user = useMemo(() => currentUser(), []);

  // 记录从 JoinAttendee 带过来的数据
  const [attendeeMeetingId, setAttendeeMeetingId] = useState("");
  const [attendeeName, setAttendeeName] = useState("");

  useEffect(() => {
    ensureConferenceId();
    // 方便你在控制台切换视图
    window.__setView = (v) => { console.log("[App] setView:", v); setView(v); };
  }, []);

  const goHome = () => setView("home");
  const goHostMenu = () => setView("hostMenu");

  // 给 JoinAttendee 的回调：校验并跳转
  const handleAttendeeJoin = (meetingId, name) => {
    const id = String(meetingId || "").trim();
    if (!id) return "Please input Meeting ID.";
    if (!/^([CT])-\d{8}-\d{4}$/.test(id)) {
      return "Invalid Meeting ID format. Expected: C-YYYYMMDD-1234 or T-YYYYMMDD-1234";
    }
    setAttendeeMeetingId(id);
    setAttendeeName(String(name || "").trim() || "Guest");
    setView("attendeePage");
    return "";
  };

  switch (view) {
    // 首页
    case "home":
      return (
        <Home
          onHost={() => setView("loginHost")}
          onJoin={() => setView("joinAttendee")}
        />
      );

    // Host 登录/注册
    case "loginHost":
      return (
        <LoginHost
          onSuccess={() => setView("hostMenu")}
          onBack={goHome}
        />
      );

    // 参会者加入
    case "joinAttendee":
      return (
        <JoinAttendee
          onJoin={handleAttendeeJoin}
          onBack={goHome}
        />
      );

    // Host 菜单
    case "hostMenu":
      return (
        <HostMenu
          onOpenConference={() => setView("hostConference")}
          onOpenTrade={() => setView("hostTrade")}
          onBack={goHome}
        />
      );

    // Conference Host
    case "hostConference":
      return (
        <HostConference
          meetingId={getMeeting()}
          onBack={goHostMenu}
          onOpenPlanner={() => setView("hostConferenceDesigner")}
        />
      );
    case "hostConferenceDesigner":
      return <HostConferenceDesigner onBack={() => setView("hostConference")} />;

    // Trade Host
    case "hostTrade":
      return (
        <HostTrade
          onBack={goHostMenu}
          onOpenPlanner={() => setView("hostTradeDesigner")}
        />
      );
    case "hostTradeDesigner":
      return <HostTradeDesigner onBack={() => setView("hostTrade")} />;

    // Attendee
    case "attendeePage":
      return (
        <AttendeePage
          meetingId={attendeeMeetingId}
          displayName={attendeeName}
          onExit={goHome}
        />
      );

    default:
      return (
        <Home
          onHost={() => setView("loginHost")}
          onJoin={() => setView("joinAttendee")}
        />
      );
  }
}
