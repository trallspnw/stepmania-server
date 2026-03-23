import { cn } from "@/lib/utils";

export interface ToastMessage {
  id: number;
  title: string;
  variant?: "default" | "destructive";
}

export function ToastViewport({
  toasts,
}: {
  toasts: ToastMessage[];
}) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-3">
      {toasts.map((toast) => (
        <div
          className={cn(
            "rounded-xl border px-4 py-3 shadow-lg shadow-stone-900/10",
            toast.variant === "destructive"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-stone-200 bg-white text-stone-900",
          )}
          key={toast.id}
        >
          <p className="whitespace-pre-line text-sm font-medium">{toast.title}</p>
        </div>
      ))}
    </div>
  );
}
