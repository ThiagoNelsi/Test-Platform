import { Input } from "@/app/components/ui/input";
import { useEffect, useState } from "react";

export const DurationInput = ({
  duration = 0,
  setDuration,
}: {
  duration: number;
  setDuration: (d: number) => void;
}) => {
  const [hours, setHours] = useState<number>(
    duration > 0 ? Math.floor(duration / 60) : 0,
  );
  const [minutes, setMinutes] = useState<number>(
    duration > 0 ? duration % 60 : 0,
  );

  useEffect(() => {
    setDuration(hours * 60 + minutes);
  }, [hours, minutes, setDuration]);

  useEffect(() => {
    setHours(Math.floor(duration / 60));
    setMinutes(duration % 60);
  }, [duration]);

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="flex gap-2">
        <div>
          <Input
            value={hours}
            onChange={(e) =>
              Number(e.target.value) < 100 && setHours(Number(e.target.value))
            }
            className="bg-white w-16"
            type="number"
            min={0}
            max={99}
          />
          <p className="ml-2 mt-1">Horas</p>
        </div>
        <p className="text-lg mt-1">:</p>
        <div>
          <Input
            value={minutes}
            onChange={(e) =>
              Number(e.target.value) < 60 && setMinutes(Number(e.target.value))
            }
            className="bg-white w-16"
            type="number"
            min={0}
            max={59}
          />
          <p className="ml-2 mt-1">Minutos</p>
        </div>
      </div>
      {duration > 0 ? (
        <p className="flex flex-col gap-1 text-xs text-neutral-700 -translate-y-1 ml-2">
          <span>
            Após iniciar a prova o aluno terá{" "}
            <strong>
              {hours > 0 ? `${hours} hora${hours > 1 ? "s" : ""}` : ""}
              {hours > 0 && minutes > 0 ? " e " : ""}
              {minutes > 0 ? `${minutes} minuto${minutes > 1 ? "s" : ""}` : ""}
            </strong>{" "}
            para concluí-la
          </span>
          <span
            className="underline cursor-pointer"
            onClick={() => {
              setDuration(0);
              setHours(0);
              setMinutes(0);
            }}
          >
            Remover limite
          </span>
        </p>
      ) : (
        <p className="text-xs text-neutral-700">Sem limite de tempo</p>
      )}
    </div>
  );
};
