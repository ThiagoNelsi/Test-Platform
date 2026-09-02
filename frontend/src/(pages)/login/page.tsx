
import { FaGoogle } from "react-icons/fa";
import { Button } from "../../components/ui/button";
import { useAuth } from "@/src/hooks/useAuth";

export default function Login() {
  const { signIn } = useAuth();

  return (
    <div className="flex flex-col gap-10 items-center justify-center h-screen">
      <h1 className="text-xl">Test Platform</h1>
      <Button
        className="flex items-center gap-5 bg-verdigris"
        onClick={signIn}
      >
        <FaGoogle /> Login with Google
      </Button>
    </div>
  );
}
