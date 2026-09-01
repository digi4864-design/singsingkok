"use client";

export function BulkActionForm({
  action,
  buttonLabel,
  confirmMessage,
  variant = "primary",
  children,
}: {
  action: (formData: FormData) => void;
  buttonLabel: string;
  confirmMessage?: string;
  variant?: "primary" | "danger";
  children: React.ReactNode;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (confirmMessage && !confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
    >
      <div className="flex items-center justify-end mb-2">
        <button
          type="submit"
          className={`px-3 py-1.5 text-sm rounded-lg text-white ${
            variant === "danger" ? "bg-red-500 hover:bg-red-600" : "bg-primary hover:bg-primary-hover"
          }`}
        >
          {buttonLabel}
        </button>
      </div>
      {children}
    </form>
  );
}
