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
  onConfirm: () => void;
  onCancel: () => void;
  className?: string;
};

export function PlannerConfirmDialog({
  open,
  onOpenChange,
  title,
  message,
  onConfirm,
  onCancel,
  className,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className={className}>{title}</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <p className={className}>{message}</p>
        </div>
        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onCancel} className={className}>
            ยกเลิก
          </Button>
          <Button
            onClick={onConfirm}
            className={`bg-red-600 hover:bg-red-700 text-white ${className || ""}`}
          >
            ตกลง
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
