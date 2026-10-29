"use client";
import type { Ref } from "react";
import { useLocale } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function Choice({
  id,
  label,
  value,
  onValueChange,
  options,
  placeholder,
  disabled,
  invalid,
  onBlur,
  triggerRef,
  required,
  describedBy,
}: {
  id?: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  onBlur?: () => void;
  triggerRef?: Ref<HTMLButtonElement>;
  required?: boolean;
  describedBy?: string;
}) {
  const locale = useLocale();
  const empty = "__campusfix_empty__";
  return (
    <Select
      dir={locale === "ar" ? "rtl" : "ltr"}
      value={value || empty}
      onValueChange={(next) => onValueChange(next === empty ? "" : next)}
      disabled={disabled}
    >
      <SelectTrigger
        ref={triggerRef}
        id={id}
        aria-label={label}
        aria-invalid={invalid}
        aria-required={required}
        aria-describedby={describedBy}
        className="choice-trigger"
        onBlur={onBlur}
      >
        <SelectValue placeholder={placeholder ?? label} />
      </SelectTrigger>
      <SelectContent position="popper" align="start" className="choice-content">
        {options.map((item) => (
          <SelectItem key={item.value || empty} value={item.value || empty}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
