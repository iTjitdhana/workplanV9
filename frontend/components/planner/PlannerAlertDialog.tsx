"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  variant?: "error" | "success";
  className?: string;
};

export function PlannerAlertDialog({
  open,
  onOpenChange,
  title,
  message,
  variant = "error",
  className,
}: Props) {
  const isSuccess = variant === "success";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-xs text-center ${className || ""}`}>
        <DialogHeader>
          <DialogTitle
            className={`${className || ""} ${isSuccess ? "text-green-600" : ""}`}
          >
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className={`mb-4 ${isSuccess ? "text-green-700" : ""}`}>{message}</div>
        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            className={`w-full ${className || ""} ${
              isSuccess ? "bg-green-600 hover:bg-green-700 text-white" : ""
            }`}
          >
            ตกลง
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
