import { Header } from "@/components/Header";
import { useEffect } from "react";
import {
  Outlet,
  ScrollRestoration,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { AppLinks } from "./AppLinks";

const AppRoot = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname === "/") {
      navigate(AppLinks.Indexers);
    }
  }, [location, navigate]);

  return (
    <div>
      <ScrollRestoration />
      <Header />
      <Outlet />
    </div>
  );
};
export default AppRoot;
