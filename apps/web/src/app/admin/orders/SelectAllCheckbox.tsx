"use client";

export function SelectAllCheckbox({ name }: { name: string }) {
  return (
    <input
      type="checkbox"
      aria-label="전체 선택"
      onChange={(e) => {
        const form = e.currentTarget.closest("form");
        if (!form) return;
        form
          .querySelectorAll<HTMLInputElement>(`input[type="checkbox"][name="${name}"]`)
          .forEach((cb) => {
            cb.checked = e.currentTarget.checked;
          });
      }}
    />
  );
}
