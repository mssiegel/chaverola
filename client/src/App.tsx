import { Route, Routes } from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";
import { StudentWorldLayout } from "@/components/layout/StudentWorldLayout";
import { HomePage } from "@/pages/HomePage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { JoinActivityPage } from "@/pages/student/JoinActivityPage";
import { CreateActivityPage } from "@/pages/teacher/CreateActivityPage";
import { HostActivityPage } from "@/pages/teacher/HostActivityPage";

/**
 * The canonical route tree (see Shared_Project_Context.md). Rendered once at
 * the root and once under `/he` (Hebrew variant — same English text for now).
 * Two pathless layout groups: most pages live under the navbar shell
 * (AppLayout), while the student join flow gets the immersive, navbar-free
 * StudentWorldLayout.
 */
function LocalizedRoutes() {
  return (
    <>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="activity/create" element={<CreateActivityPage />} />
        <Route path="activity/host/:joinCode" element={<HostActivityPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route element={<StudentWorldLayout />}>
        {/* Both join routes render the same page so the code input can swap
            in-place for the name input when a code checks out. */}
        <Route path="activity/join" element={<JoinActivityPage />} />
        <Route path="activity/join/:joinCode" element={<JoinActivityPage />} />
      </Route>
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/">{LocalizedRoutes()}</Route>
      <Route path="/he">{LocalizedRoutes()}</Route>
    </Routes>
  );
}
