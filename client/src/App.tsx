import { Route, Routes } from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";
import { HomePage } from "@/pages/HomePage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { StudentChatDemoPage } from "@/pages/demo/StudentChatDemoPage";
import { JoinActivityPage } from "@/pages/student/JoinActivityPage";
import { JoinCodePage } from "@/pages/student/JoinCodePage";
import { CreateActivityPage } from "@/pages/teacher/CreateActivityPage";
import { HostActivityPage } from "@/pages/teacher/HostActivityPage";

/**
 * The canonical route tree (see Shared_Project_Context.md). Rendered once at the
 * root and once under `/he` (Hebrew variant — same English text for now).
 */
function LocalizedRoutes() {
  return (
    <>
      <Route index element={<HomePage />} />
      <Route path="activity/join" element={<JoinCodePage />} />
      <Route path="activity/join/:joinCode" element={<JoinActivityPage />} />
      <Route path="activity/create" element={<CreateActivityPage />} />
      <Route path="activity/host/:joinCode" element={<HostActivityPage />} />
      {/* Temporary demo route — wired into the student flow in a later prompt. */}
      <Route path="demo/student-chat" element={<StudentChatDemoPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        {LocalizedRoutes()}
      </Route>
      <Route path="/he" element={<AppLayout />}>
        {LocalizedRoutes()}
      </Route>
    </Routes>
  );
}
