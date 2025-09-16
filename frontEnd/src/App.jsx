// src/App.jsx
import { useState } from "react";
import Home from "./pages/Home";
import HostMenu from "./pages/HostMenu";
import HostConference from "./pages/HostConference";
import HostConferenceDesigner from "./pages/HostConferenceDesigner";
import HostTrade from "./pages/HostTrade";
import HostTradeDesigner from "./pages/HostTradeDesigner";
import AttendeePage from "./pages/AttendeePage";
import LoginHost from "./components/LoginHost";
import JoinAttendee from "./components/JoinAttendee";
import { getMeeting } from "./lib/store"; // 删掉了 currentUser 的自动跳转

// views: home | hostAuth | hostMenu | hostConference | hostConferenceDesigner | hostTrade | attendeeJoin | attendeePage
export default function App() {
  // ✅ 默认就是 home（先选 Host / Attendee）
  const [view, setView] = useState("home");

  const [attendee, setAttendee] = useState({ name: "", meetingId: "" });
  const [conferenceId, setConferenceId] = useState("");
  const [tradeId, setTradeId] = useState("");

  // host 登录成功 → HostMenu
  function onHostAuthed() {
    setView("hostMenu");
  }

  // attendee 加入
  function onJoin(meetingId, name) {
    const meeting = getMeeting(meetingId);
    if (!meeting) return "Invalid meeting ID.";
    setAttendee({ name: name || genGuestName(), meetingId });
    setView("attendeePage");
    return "";
  }

  // -------- 视图切换 --------
  if (view === "hostMenu") {
    return (
      <HostMenu
        // ⚠️ 与 HostMenu.jsx 的参数名保持一致
        onOpenConference={() => setView("hostConference")}
        onOpenTrade={() => setView("hostTrade")}
        onBack={() => setView("home")}
      />
    );
  }

  if (view === "hostConference") {
    return (
      <HostConference
        onBack={() => setView("hostMenu")}
        onExit={() => setView("home")}
        onOpenPlanner={(id) => {
          setConferenceId(id);
          setView("hostConferenceDesigner");
        }}
      />
    );
  }

  if (view === "hostConferenceDesigner") {
    return (
      <HostConferenceDesigner
        meetingId={conferenceId}
        onBack={() => setView("hostConference")}
      />
    );
  }

  if (view === "hostTrade") {
    return (
      <HostTrade
        onBack={() => setView("hostMenu")}
        onExit={() => setView("home")}
        onOpenPlanner={(id) => {
          setTradeId(id);
          setView("hostTradeDesigner");
        }}
      />
    );
  }

  if (view === "hostTradeDesigner") {
    return (
      <HostTradeDesigner
        showId={tradeId}
        onBack={() => setView("hostTrade")}
      />
    );
  }


  if (view === "hostAuth") {
    return <LoginHost onSuccess={onHostAuthed} onBack={() => setView("home")} />;
  }

  if (view === "attendeeJoin") {
    return <JoinAttendee onJoin={onJoin} onBack={() => setView("home")} />;
  }

  if (view === "attendeePage") {
    return (
      <AttendeePage
        meetingId={attendee.meetingId}
        displayName={attendee.name || genGuestName()}
        onExit={() => setView("attendeeJoin")}
      />
    );
  }

  // 默认 Home：先让用户选择 Host 或 Attendee
  return (
    <Home
      // 如果你希望 Host 不经过登录，改成：() => setView("hostMenu")
      onHost={() => setView("hostAuth")}
      onJoin={() => setView("attendeeJoin")}
    />
  );
}

function genGuestName() {
  return `Guest-${Math.floor(Math.random() * 9000 + 1000)}`;
}
