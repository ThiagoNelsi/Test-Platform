type ButtonProps = {
    icon: React.ReactNode;
    text: string;
    onClick?: () => void;
}

export default function SidebarButton({ icon, text, onClick }: ButtonProps) {
    return (
        <button onClick={onClick} className="flex items-center gap-2 p-2 hover:bg-neutral-300 rounded transition">
            {icon}
            <p>{text}</p>
        </button>
    )
}