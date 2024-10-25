import { RouteObject } from "react-router-dom";
import { AppLinks } from "@/navigation/AppLinks";
import { Home } from "./views/Home";

export const HomeRoute: RouteObject = {
  path: AppLinks.Home,
  element: <Home />,
  index: true,
};
