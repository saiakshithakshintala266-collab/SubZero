"use client";
import { useState, useCallback } from "react";
import type { ToastData } from "@/components/Toast";

export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const addToast = useCallback((type: ToastData["type"], message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, type, message }]);
  }, []);
  const dismissToast = useCallback((id: string) => {
    setToasts(t => t.filter(x => x.id !== id));
  }, []);
  return { toasts, addToast, dismissToast };
}
