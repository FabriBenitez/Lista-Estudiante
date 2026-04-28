import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import EmptyState from "../components/EmptyState";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <AppShell>
      <EmptyState
        title="Pantalla no encontrada"
        description="La ruta que abriste no existe dentro de esta app."
        action={
          <button className="primary-button" onClick={() => navigate("/")}>
            Volver al dashboard
          </button>
        }
      />
    </AppShell>
  );
}

