"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { createSafeDate, formatDateThaiShort } from "@/lib/dateUtils";
import { normalizeTimeForForm } from "@/lib/productionDay";

export type AutoFillOption = "latest" | "best" | "manual" | null;

type PendingJob = { jobCode: string; jobName: string } | null;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingJobData: PendingJob;
  pendingLatestData: any;
  autoFillOption: AutoFillOption;
  onAutoFillOptionChange: (value: AutoFillOption) => void;
  onConfirm: () => void;
  className?: string;
};

export function AutoFillJobDialog({
  open,
  onOpenChange,
  pendingJobData,
  pendingLatestData,
  autoFillOption,
  onAutoFillOptionChange,
  onConfirm,
  className,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={className}>
        <DialogHeader>
          <DialogTitle className="text-green-600">เลือกวิธีการกรอกข้อมูล</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <div className="mb-4 text-gray-700 font-medium">
            <p className="font-bold">
              {pendingJobData?.jobCode} - {pendingJobData?.jobName}
            </p>
            <p className="mt-1">กรุณาเลือกรูปแบบการกรอกข้อมูล:</p>
          </div>

          <RadioGroup
            value={autoFillOption || ""}
            onValueChange={(value) => {
              onAutoFillOptionChange(value as AutoFillOption);
            }}
            className="space-y-3 mb-4"
          >
            <div className="flex items-center space-x-3 opacity-50">
              <RadioGroupItem value="best" id="best" disabled />
              <label
                htmlFor="best"
                className="text-sm font-medium leading-none cursor-not-allowed flex-1"
              >
                <div className="text-gray-500">ข้อมูลประวัติการผลิตย้อนหลัง</div>
              </label>
            </div>

            <div className="flex items-start space-x-3">
              <RadioGroupItem value="latest" id="latest" className="mt-0.5" />
              <div className="flex-1">
                <label
                  htmlFor="latest"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer block"
                >
                  <div className="text-gray-700">ข้อมูลตามแผนผลิตครั้งล่าสุด</div>
                </label>
                {pendingLatestData && (
                  <div className="mt-2 ml-0 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="space-y-2 text-sm">
                      {pendingLatestData.operators &&
                        Array.isArray(pendingLatestData.operators) &&
                        pendingLatestData.operators.filter((op: string) => op && op !== "")
                          .length > 0 && (
                          <div className="flex items-start gap-2">
                            <span className="font-semibold text-gray-700 min-w-[100px]">
                              ผู้ปฏิบัติงาน:
                            </span>
                            <span className="text-gray-800 flex-1">
                              {pendingLatestData.operators
                                .filter((op: string) => op && op !== "")
                                .join(" ")}
                            </span>
                          </div>
                        )}

                      {(pendingLatestData.start_time || pendingLatestData.end_time) && (
                        <div className="flex items-start gap-2">
                          <span className="font-semibold text-gray-700 min-w-[100px]">เวลา:</span>
                          <span className="text-gray-800 flex-1">
                            {pendingLatestData.start_time
                              ? normalizeTimeForForm(pendingLatestData.start_time)
                              : "--"}
                            {" - "}
                            {pendingLatestData.end_time
                              ? normalizeTimeForForm(pendingLatestData.end_time)
                              : "--"}
                          </span>
                        </div>
                      )}

                      <div className="flex items-start gap-2">
                        <span className="font-semibold text-gray-700 min-w-[100px]">ห้องผลิต:</span>
                        <span className="text-gray-800 flex-1">
                          {pendingLatestData.room_name ||
                            pendingLatestData.room_code ||
                            "ไม่มีข้อมูล"}
                        </span>
                      </div>

                      {pendingLatestData.production_date &&
                        (() => {
                          const dataDate = createSafeDate(pendingLatestData.production_date);
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          if (dataDate) {
                            dataDate.setHours(0, 0, 0, 0);
                            const diffTime = today.getTime() - dataDate.getTime();
                            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                            const formattedDate = formatDateThaiShort(dataDate);
                            let dayText = "";
                            if (diffDays === 0) dayText = "วันนี้";
                            else if (diffDays === 1) dayText = "1 วันที่แล้ว";
                            else dayText = `${diffDays} วันที่แล้ว`;
                            return (
                              <div className="flex items-start gap-2 mt-2 pt-2 border-t border-gray-300 text-xs">
                                <span className="font-semibold text-gray-700 min-w-[100px]">
                                  ข้อมูลจากวันที่:
                                </span>
                                <span className="text-gray-800 flex-1">
                                  {formattedDate} ({dayText})
                                </span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <RadioGroupItem value="manual" id="manual" />
              <label
                htmlFor="manual"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
              >
                <div className="text-gray-700">กำหนดข้อมูลด้วยตัวเอง</div>
              </label>
            </div>
          </RadioGroup>
        </div>
        <DialogFooter>
          <Button
            onClick={onConfirm}
            className="w-full bg-green-600 hover:bg-green-700 text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            disabled={autoFillOption === null}
          >
            ตกลง
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
