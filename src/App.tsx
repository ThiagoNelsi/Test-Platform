import { BrowserRouter } from "react-router-dom";
import { AppProviders } from "./layouts";
import AppRouter from "./router";

export default function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </AppProviders>
  );
}
