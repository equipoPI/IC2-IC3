import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatArgentinianDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  try {
    let dateObj: Date;
    if (date instanceof Date) {
      dateObj = date;
    } else {
      let formatted = date.trim();
      if (!formatted.includes("T") && formatted.includes(" ")) {
        formatted = formatted.replace(" ", "T");
      }
      if (!formatted.includes("Z") && !/[+-]\d{2}:\d{2}$/.test(formatted)) {
        formatted = `${formatted}-03:00`;
      }
      dateObj = new Date(formatted);
    }
    
    if (isNaN(dateObj.getTime())) return "-";
    
    return dateObj.toLocaleString("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  } catch (e) {
    return "-";
  }
}
