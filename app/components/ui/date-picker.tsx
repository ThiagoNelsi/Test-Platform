"use client";

import * as React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/app/components/ui/button";
import { Calendar } from "@/app/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { ScrollArea } from "./scroll-area";
import { Separator } from "./separator";

type DatePickerProps = {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  fromDate?: Date;
  disabled?: boolean;
  defaultTime?: string;
};

export function DatePicker({
  date,
  setDate,
  fromDate,
  disabled = false,
  defaultTime = "23:59",
}: DatePickerProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    undefined,
  );
  const [selectedTime, setSelectedTime] = React.useState<string>(defaultTime);

  React.useEffect(() => {
    if (selectedDate) {
      const [hour, minute] = selectedTime.split(":");
      const d = new Date(selectedDate);
      d.setHours(Number(hour));
      d.setMinutes(Number(minute));
      if (d.getTime() !== date?.getTime()) setDate(d);
    }
  }, [selectedDate, selectedTime, setDate, date]);

  React.useEffect(() => {
    if (date) {
      setSelectedDate(date);
      setSelectedTime(format(date, "HH:mm"));
    }
  }, [date]);

  return (
    <Popover>
      <PopoverTrigger asChild disabled={disabled}>
        <Button
          variant={"outline"}
          className={cn(
            "w-[280px] justify-start text-left font-normal",
            !date && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? (
            format(date, "dd 'de' MMMM", { locale: ptBR }) +
            " às " +
            selectedTime
          ) : (
            <span>Escolha uma data</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="flex w-auto p-0">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          initialFocus
          locale={ptBR}
          fromDate={fromDate}
        />
        <Separator orientation="vertical" className="h-64 my-auto" />
        <div className="ml-5">
          <h2 className="text-sm font-semibold mt-4">Horário</h2>
          <Select
            defaultValue={selectedTime!}
            onValueChange={(value) => setSelectedTime(value)}
          >
            <SelectTrigger className="font-normal focus:ring-0 w-[120px] focus:ring-offset-0 mt-2 mr-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <ScrollArea className="h-[15rem]">
                {Array.from({ length: 96 }).map((_, i) => {
                  const hour = Math.floor(i / 4)
                    .toString()
                    .padStart(2, "0");
                  const minute = ((i % 4) * 15).toString().padStart(2, "0");
                  return (
                    <SelectItem key={i} value={`${hour}:${minute}`}>
                      {hour}:{minute}
                    </SelectItem>
                  );
                })}
                <SelectItem key={96} value="23:59">
                  23:59
                </SelectItem>
              </ScrollArea>
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  );
}
