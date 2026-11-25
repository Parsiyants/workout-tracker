import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Analytics from "./pages/Analytics";
import Catalog from "./pages/Catalog";
import Demo from "./pages/Demo";
import ExerciseDetail from "./pages/ExerciseDetail";
import ExerciseForm from "./pages/ExerciseForm";
import Gymnastics from "./pages/Gymnastics";
import GymnasticsProgram from "./pages/GymnasticsProgram";
import GymnasticsProgramEditor from "./pages/GymnasticsProgramEditor";
import History from "./pages/History";
import HistoryDetail from "./pages/HistoryDetail";
import Home from "./pages/Home";
import Login from "./pages/Login";
import TemplateEditor from "./pages/TemplateEditor";
import Templates from "./pages/Templates";
import Users from "./pages/Users";
import WorkoutSession from "./pages/WorkoutSession";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1 },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/demo" element={<Demo />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Home />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/catalog/new" element={<ExerciseForm />} />
            <Route path="/catalog/:id" element={<ExerciseDetail />} />
            <Route path="/catalog/:id/edit" element={<ExerciseForm />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/templates/new" element={<TemplateEditor />} />
            <Route path="/templates/:id/edit" element={<TemplateEditor />} />
            <Route path="/session" element={<WorkoutSession />} />
            <Route path="/gymnastics" element={<Gymnastics />} />
            <Route path="/gymnastics/programs/new" element={<GymnasticsProgramEditor />} />
            <Route path="/gymnastics/programs/:id" element={<GymnasticsProgram />} />
            <Route path="/gymnastics/programs/:id/edit" element={<GymnasticsProgramEditor />} />
            <Route path="/history" element={<History />} />
            <Route path="/history/:id" element={<HistoryDetail />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/users" element={<Users />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
