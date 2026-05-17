"use client";

import { FaGoogle } from "react-icons/fa";
import { Button } from "../../components/ui/button";

export default function Login() {
  const handleLogin = () => {
    const backend = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

    if (!backend) {
      // Fail fast and surface the misconfiguration instead of silently redirecting to the frontend origin
      console.error("NEXT_PUBLIC_BACKEND_URL is not set — login cannot be routed to backend.");
      alert("Backend URL is not configured. Set NEXT_PUBLIC_BACKEND_URL in your frontend env.");
      return;
    }

    const base = backend.replace(/\/+$/g, "");
    window.location.href = `${base}/auth/google/start`;
  };

  return (
    <div className="flex flex-col gap-10 items-center justify-center h-screen">
      <h1 className="text-xl">Test Platform</h1>
      <Button
        className="flex items-center gap-5 bg-verdigris"
        onClick={handleLogin}
      >
        <FaGoogle /> Login with Google
      </Button>
    </div>
  );
}
