import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { fr } from "date-fns/locale";
import { parseAnyDate, formatDateFR, toISODate } from "@/lib/date-utils";

type ChangeLike = { target: { value: string } };

interface DateInputProps {
  value?: string | null;
  onChange?: (e: ChangeLike) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
}

export function DateInput({
  value,
  onChange,
  className,
  disabled,
  placeholder = "jj/mm/aaaa",
  id,
}: DateInputProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  const selected = parseAnyDate(value) ?? undefined;

  const emit = (iso: string) => onChange?.({ target: { value: iso } });

  // Sync inputValue with external value
  React.useEffect(() => {
    setInputValue(selected ? formatDateFR(selected) : "");
  }, [value]);

  // Auto-format as user types: adds "/" after dd and dd/MM
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/[^\d]/g, ""); // digits only
    if (raw.length > 8) raw = raw.slice(0, 8);

    let formatted = raw;
    if (raw.length >= 3) formatted = raw.slice(0, 2) + "/" + raw.slice(2);
    if (raw.length >= 5) formatted = raw.slice(0, 2) + "/" + raw.slice(2, 4) + "/" + raw.slice(4);

    setInputValue(formatted);

    // Only emit when full date is entered (dd/MM/yyyy = 10 chars)
    if (formatted.length === 10) {
      const parsed = parseAnyDate(formatted);
      if (parsed) emit(toISODate(parsed));
      else emit("");
    } else {
      emit("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && inputValue === "") emit("");
  };

  return (
    <div className={cn("relative flex items-center", className)}>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        disabled={disabled}
        placeholder={placeholder}
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 pr-8 text-sm shadow-sm",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
      />

      {/* Clear button */}
      {selected && !disabled && (
        <span
          role="button"
          tabIndex={0}
          onClick={() => { setInputValue(""); emit(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") { setInputValue(""); emit(""); } }}
          className="absolute right-7 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          aria-label="Effacer la date"
        >
          ✕
        </span>
      )}

      {/* Calendar icon opens popover */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className="absolute right-2 text-muted-foreground hover:text-foreground disabled:opacity-50"
            aria-label="Ouvrir le calendrier"
          >
            <CalendarIcon className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            locale={fr}
            selected={selected}
            onSelect={(d) => {
              emit(d ? toISODate(d) : "");
              setOpen(false);
            }}
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default DateInput;