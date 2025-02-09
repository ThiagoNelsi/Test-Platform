type ButtonProps = {
    icon: React.ReactNode;
    text: string;
}

export default function SidebarButton({ icon, text }: ButtonProps) {
    return (
        <button className="flex items-center gap-2 p-2 hover:bg-neutral-300 rounded transition">
            {icon}
            <p>{text}</p>
        </button>
    )
}