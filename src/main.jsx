import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Route, Switch, Router } from "wouter";

import "./index.css";
import LandingPage from "./pages/LandingPage.jsx";
import LangSettingPage from "./pages/LangSettingPage.jsx";
import GeoSettingPage from "./pages/GeoSettingPage.jsx";
import PreferSettingPage from "./pages/PreferSettingPage.jsx";
import MainPage from "./pages/MainPage.jsx";
import MainPage2 from "./pages/MainPage2.jsx";
import AIChatPageX from "./AIchat/page.jsx";
import BusanBestPage from "./pages/BusanBestPage.jsx";
import AIChatPage from "./pages/AIChatPage.jsx";
import FontSize from "./components/FontSize.jsx";
import CourseDetailPage from "./pages/CourseDetailPage.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Router>
      <FontSize />
      <Switch>
        <Route path="/landing" component={LandingPage} />
        <Route path="/setting/lang" component={LangSettingPage} />
        <Route path="/setting/geo" component={GeoSettingPage} />
        <Route path="/setting/prefer" component={PreferSettingPage} />
        <Route path="/" component={MainPage2} />
        <Route path="/aichat" component={AIChatPageX} />
        <Route path="/recommend" component={BusanBestPage} />
        <Route path="/ai-chat" component={AIChatPage} />
        <Route path="/course/:kind" component={CourseDetailPage} />
        <Route>404: No such page!</Route>
      </Switch>
    </Router>
  </StrictMode>,
);
