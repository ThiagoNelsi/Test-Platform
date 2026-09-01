import { AppLink as Link } from "@/app/components/router-compat";

type ButtonProps = {
  icon: React.ReactNode;
  text: string;
  onClick?: () => void;
  href?: string;
};

export default function SidebarButton({
  icon,
  text,
  onClick,
  href,
}: ButtonProps) {
  if (href)
    return (
      <Link
        to={href}
        className="flex items-center gap-2 p-2 hover:bg-neutral-300 rounded transition"
      >
        {icon}
        <p>{text}</p>
      </Link>
    );
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 p-2 hover:bg-neutral-300 rounded transition"
    >
      {icon}
      <p>{text}</p>
    </button>
  );
}
