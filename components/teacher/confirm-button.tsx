"use client";

import { Button, type ButtonProps } from "@/components/ui/button";

/** Submit tlačítko, které se před odesláním formuláře zeptá na potvrzení. */
export function ConfirmButton({ message, onClick, ...props }: ButtonProps & { message: string }) {
  return (
    <Button
      type="submit"
      {...props}
      onClick={(e) => {
        if (!window.confirm(message)) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
    />
  );
}
