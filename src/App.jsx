import { Navigate, Route, Routes } from "react-router-dom";
import AttendancePage from "./pages/AttendancePage";
import DashboardPage from "./pages/DashboardPage";
import HistoryPage from "./pages/HistoryPage";
import NotFoundPage from "./pages/NotFoundPage";
import SaveConfirmationPage from "./pages/SaveConfirmationPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/courses/:courseId" element={<AttendancePage />} />
      <Route path="/courses/:courseId/history" element={<HistoryPage />} />
      <Route path="/courses/:courseId/history/:date" element={<AttendancePage />} />
      <Route
        path="/courses/:courseId/confirmation/:date"
        element={<SaveConfirmationPage />}
      />
      <Route path="/home" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
