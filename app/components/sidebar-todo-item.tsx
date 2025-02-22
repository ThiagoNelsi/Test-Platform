import { Todo } from "@/lib/test-service";
import moment from "moment";

type ListItemProps = {
    todo: Todo
}

export default function SidebarTodoItem({ todo }: ListItemProps) {
    let formattedDate = "";
    if (todo.dueDate) {
        const date = new Date(todo.dueDate);
        moment.locale("pt-br");
        formattedDate = moment(date).calendar();
    }

    let status = todo.startTime ? "Iniciado" : "Pendente";
    if (todo.finishTime) return null;
    if (todo.dueDate && new Date(todo.dueDate) < new Date()) status = "Atrasado";

    const statusColor: {[key: string]: string} = {
        "Iniciado": "text-green-600",
        "Pendente": "text-orange-600",
        "Atrasado": "text-red-600"
    }

    return (
        <li className="flex flex-col gap-2 p-4 hover:bg-neutral-300 rounded transition cursor-pointer border-l-neutral-400 border-l-4">
            <span className={`${statusColor[status]} text-xs`}>{status}</span>
            <p className="font-medium text-sm">{todo.name}</p>
            {formattedDate &&
            <span className="text-xs">Prazo: {formattedDate}</span>
            }
        </li>
    )
}