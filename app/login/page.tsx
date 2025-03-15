"use client";

import { signIn } from "next-auth/react";
import { FaGoogle } from "react-icons/fa";
import { Button } from "../components/ui/button";

export default function Login() {
  const handleLogin = () => {
    signIn("google", { callbackUrl: "http://localhost:3000/home" });
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
