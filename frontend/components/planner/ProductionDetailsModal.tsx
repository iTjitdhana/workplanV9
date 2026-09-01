"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: any | null;
  logs: any[];
  formatTime: (t: any) => string;
  formatDuration: (t: any) => string;
  className?: string;
};

export function ProductionDetailsModal({
  open,
  onOpenChange,
  data,
  logs,
  formatTime,
  formatDuration,
  className,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-4xl max-h-[90vh] overflow-y-auto ${className || ""}`}>
        <DialogHeader>
          <DialogTitle className={className}>รายละเอียดการผลิต</DialogTitle>
        </DialogHeader>
        {data && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <Label className={`text-sm font-bold text-gray-700 ${className || ""}`}>
                    ชื่องาน
                  </Label>
                  <p className={`text-lg font-semibold text-gray-900 ${className || ""}`}>
                    {data.job_name}
                  </p>
                </div>
                <div>
                  <Label className={`text-sm font-bold text-gray-700 ${className || ""}`}>
                    หมายเหตุ
                  </Label>
                  <p className={`text-sm text-gray-600 ${className || ""}`}>
                    {data.notes || data.note || "ไม่มีหมายเหตุ"}
                  </p>
                </div>
                <div>
                  <Label className={`text-sm font-bold text-gray-700 ${className || ""}`}>
                    ผู้ปฏิบัติงาน
                  </Label>
                  <p className={`text-sm text-gray-600 ${className || ""}`}>
                    {data.operators || "ไม่ระบุ"}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <Label className={`text-sm font-bold text-gray-700 ${className || ""}`}>
                    เวลาเริ่มต้นตามแผนผลิต
                  </Label>
                  <p className={`text-lg font-semibold text-blue-600 ${className || ""}`}>
                    {data.start_time || "ไม่ระบุ"}
                  </p>
                </div>
                <div>
                  <Label className={`text-sm font-bold text-gray-700 ${className || ""}`}>
                    เวลาสิ้นสุดตามแผนผลิต
                  </Label>
                  <p className={`text-lg font-semibold text-blue-600 ${className || ""}`}>
                    {data.end_time || "ไม่ระบุ"}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <Label className={`text-lg font-bold text-gray-700 ${className || ""}`}>
                ข้อมูลการผลิตตามจริง
              </Label>
              {logs.length > 0 ? (
                <div className="mt-3 space-y-3">
                  {logs.map((log, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                    >
                      <div className="mb-3">
                        <Label
                          className={`text-sm font-bold text-gray-700 ${className || ""}`}
                        >
                          ขั้นตอนที่ {log.process_number}
                        </Label>
                        <p className={`text-sm text-gray-600 ${className || ""}`}>
                          {log.process_description || "ไม่ระบุ"}
                        </p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label
                            className={`text-sm font-bold text-gray-700 ${className || ""}`}
                          >
                            เวลาเริ่มต้นตามจริง
                          </Label>
                          <p className={`text-sm text-green-600 ${className || ""}`}>
                            {formatTime(log.start_time)}
                          </p>
                        </div>
                        <div>
                          <Label
                            className={`text-sm font-bold text-gray-700 ${className || ""}`}
                          >
                            เวลาสิ้นสุดตามจริง
                          </Label>
                          <p className={`text-sm text-green-600 ${className || ""}`}>
                            {formatTime(log.stop_time)}
                          </p>
                        </div>
                        <div>
                          <Label
                            className={`text-sm font-bold text-gray-700 ${className || ""}`}
                          >
                            เวลาที่ใช้
                          </Label>
                          <p className={`text-sm text-purple-600 ${className || ""}`}>
                            {formatDuration(log.used_time)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <p className={`text-sm text-gray-500 text-center ${className || ""}`}>
                    ไม่มีข้อมูลการผลิตตามจริง
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className={className}
          >
            ปิด
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
