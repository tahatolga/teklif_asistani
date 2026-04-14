import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useSettings } from "./stores/settings";
import { useParameters } from "./stores/parameters";

export default function App() {
  const loadSettings = useSettings((s) => s.load);
  const loadParameters = useParameters((s) => s.load);
  const nav = useNavigate();

  useEffect(() => {
    loadSettings().catch(() => {});
    loadParameters().catch(() => {});
  }, [loadSettings, loadParameters]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        nav("/proposals/new");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [nav]);

  return <Outlet />;
}
