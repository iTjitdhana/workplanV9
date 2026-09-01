"use client";

import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SimpleDatePicker } from "@/components/SimpleDatePicker";

const RichNoteEditor = dynamic(() => import("@/components/RichNoteEditor"), { ssr: false });

export type EditDraftFormState = {
  editJobName: string;
  setEditJobName: (v: string) => void;
  editOperators: string[];
  setEditOperators: (v: string[] | ((prev: string[]) => string[])) => void;
  editStartTime: string;
  setEditStartTime: (v: string) => void;
  editEndTime: string;
  setEditEndTime: (v: string) => void;
  editRoom: string;
  setEditRoom: (v: string) => void;
  editMachine: string;
  setEditMachine: (v: string) => void;
  editNote: string;
  setEditNote: (v: string) => void;
  editDate: string;
  setEditDate: (v: string) => void;
};

type UserLite = { id?: number | string; name: string; id_code?: string };
type MachineLite = { machine_code: string; machine_name: string };
type RoomLite = { room_code: string; room_name: string };

type Props = EditDraftFormState & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editDraftData: any | null;
  editDraftId: string;
  users: UserLite[];
  machines: MachineLite[];
  rooms: RoomLite[];
  timeOptions: string[];
  isSubmitting: boolean;
  className?: string;
  onSaveDraft: () => void;
  onSaveComplete: () => void;
  onDeleteDraft: (id: string) => void;
  onCancelProduction: (id: string) => void;
  onDeleteWorkPlan: (id: string) => void;
};

export function EditDraftModal({
  open,
  onOpenChange,
  editDraftData,
  editDraftId,
  users,
  machines,
  rooms,
  timeOptions,
  isSubmitting,
  className,
  editJobName,
  setEditJobName,
  editOperators,
  setEditOperators,
  editStartTime,
  setEditStartTime,
  editEndTime,
  setEditEndTime,
  editRoom,
  setEditRoom,
  editMachine,
  setEditMachine,
  editNote,
  setEditNote,
  editDate,
  setEditDate,
  onSaveDraft,
  onSaveComplete,
  onDeleteDraft,
  onCancelProduction,
  onDeleteWorkPlan,
}: Props) {
  const cn = className || "";
  return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={`max-w-4xl max-h-[90vh] overflow-y-auto ${cn}`}>
          <DialogHeader>
            <DialogTitle className={cn}>แก้ไขแบบร่างงานผลิต</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 py-2">
            {/* คอลัมน์ซ้าย */}
            <div className="space-y-3">
              {/* วันที่ผลิต */}
              <div className="space-y-1">
                <Label className={`text-xs font-bold text-gray-700 ${cn}`}>วันที่ผลิต</Label>
                <SimpleDatePicker
                  value={editDate}
                  onChange={setEditDate}
                  placeholder="เลือกวันที่"
                  className="w-full"
                />
              </div>
              {/* ชื่องาน */}
              <div className="space-y-1">
                <Label className={`text-xs font-bold text-gray-700 ${cn}`}>ชื่องาน</Label>
                <Input
                  value={editJobName}
                  onChange={e => setEditJobName(e.target.value)}
                  className={`text-sm h-8 ${cn}`}
                />
              </div>
              {/* เครื่องบันทึกข้อมูลการผลิต */}
              <div className="space-y-1">
                <Label className={`text-xs font-bold text-gray-700 ${cn}`}>เครื่องบันทึกข้อมูลการผลิต</Label>
                <Select
                  value={editMachine || "__none__"}
                  onValueChange={val => setEditMachine(val === "__none__" ? "" : val)}
                >
                  <SelectTrigger className={`text-sm h-8 ${cn}`}>
                    <SelectValue placeholder="เลือก..." />
                  </SelectTrigger>
                  <SelectContent className={cn}>
                    <SelectItem value="__none__" className={cn}>กรุณาเลือก</SelectItem>
                    {machines.map(m => (
                      <SelectItem key={m.machine_code} value={m.machine_code} className={cn}>{m.machine_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* ห้องผลิต */}
              <div className="space-y-1">
                <Label className={`text-xs font-bold text-gray-700 ${cn}`}>ห้องผลิต</Label>
                <Select
                  value={editRoom || "__none__"}
                  onValueChange={val => setEditRoom(val === "__none__" ? "" : val)}
                >
                  <SelectTrigger className={`text-sm h-8 ${cn}`}>
                    <SelectValue placeholder="เลือกห้องผลิต..." />
                  </SelectTrigger>
                  <SelectContent className={cn}>
                    <SelectItem value="__none__" className={cn}>กรุณาเลือก</SelectItem>
                    {rooms.map(r => (
                      <SelectItem key={r.room_code} value={r.room_code} className={cn}>{r.room_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* คอลัมน์ขวา */}
            <div className="space-y-3">
              {/* ผู้ปฏิบัติงาน */}
              <div className="space-y-1">
                <Label className={`text-xs font-bold text-gray-700 ${cn}`}>ผู้ปฏิบัติงาน (1-4 คน)</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[1, 2, 3, 4].map((position) => {
                    // ตรวจสอบว่าช่องก่อนหน้ายังว่างอยู่หรือไม่ (สำหรับ validation)
                    const isPreviousEmpty = position > 1 && (!editOperators[position - 2] || editOperators[position - 2] === "");
                    const isDisabled = isPreviousEmpty;
                    
                    return (
                      <div key={position} className="space-y-1">
                        <Label className={`text-xs text-gray-600 ${cn} ${isDisabled ? 'text-gray-400' : ''}`}>
                          ผู้ปฏิบัติงาน {position}
                          {isDisabled && <span className="ml-1 text-xs text-gray-400">(ต้องกรอกคนที่ {position - 1} ก่อน)</span>}
                        </Label>
                        <Select
                          value={editOperators[position - 1] || "__none__"}
                          onValueChange={val => {
                            const newOps = [...editOperators];
                            const newValue = val === "__none__" ? "" : val;
                            newOps[position - 1] = newValue;
                            
                            // ถ้าเคลียร์ช่อง ให้เคลียร์ช่องถัดไปทั้งหมดด้วย
                            if (newValue === "") {
                              for (let i = position; i < 4; i++) {
                                newOps[i] = "";
                              }
                            }
                            
                            setEditOperators(newOps);
                          }}
                          disabled={isDisabled}
                        >
                          <SelectTrigger className={`h-8 text-xs ${cn} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={isDisabled}>
                            <SelectValue placeholder={isDisabled ? "กรุณากรอกคนที่ " + (position - 1) + " ก่อน" : "เลือก"} />
                          </SelectTrigger>
                          <SelectContent className={cn}>
                            <SelectItem value="__none__" className={cn}>กรุณาเลือก</SelectItem>
                            {users && users.length > 0 ? (
                              users.map(u => (
                                <SelectItem key={u.id_code} value={u.name} className={cn}>{u.name}</SelectItem>
                              ))
                            ) : (
                              <SelectItem value="__none__" className={cn}>ไม่พบข้อมูลผู้ปฏิบัติงาน</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* เวลาเริ่ม-สิ้นสุด */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className={`text-xs font-bold text-gray-700 ${cn}`}>เวลาเริ่ม</Label>
                  <Select value={editStartTime || "__none__"} onValueChange={val => setEditStartTime(val === "__none__" ? "" : val)}>
                    <SelectTrigger className={`text-sm h-8 ${cn}`}>
                      <SelectValue placeholder="เลือกเวลาเริ่ม..." />
                    </SelectTrigger>
                    <SelectContent className={cn}>
                      <SelectItem value="__none__" className={cn}>เลือกเวลาเริ่ม...</SelectItem>
                      {timeOptions && timeOptions.length > 0 ? (
                        timeOptions.map(t => (
                          <SelectItem key={t} value={t} className={cn}>{t}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="__none__" className={cn}>ไม่พบตัวเลือกเวลา</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className={`text-xs font-bold text-gray-700 ${cn}`}>เวลาสิ้นสุด</Label>
                  <Select value={editEndTime || "__none__"} onValueChange={val => setEditEndTime(val === "__none__" ? "" : val)}>
                    <SelectTrigger className={`text-sm h-8 ${cn}`}>
                      <SelectValue placeholder="เลือกเวลาสิ้นสุด..." />
                    </SelectTrigger>
                    <SelectContent className={cn}>
                      <SelectItem value="__none__" className={cn}>เลือกเวลาสิ้นสุด...</SelectItem>
                      {timeOptions && timeOptions.length > 0 ? (
                        timeOptions.map(t => (
                          <SelectItem key={t} value={t} className={cn}>{t}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="__none__" className={cn}>ไม่พบตัวเลือกเวลา</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* หมายเหตุ */}
              <div className="space-y-1">
                <Label className={`text-xs font-bold text-gray-700 ${cn}`}>หมายเหตุ</Label>
                <RichNoteEditor
                  value={editNote}
                  onChange={(v: string) => setEditNote(v)}
                  className={`text-sm ${cn}`}
                  placeholder="เพิ่มหมายเหตุเพิ่มเติมสำหรับการผลิต..."
                />
              </div>
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            {/* ปุ่มการกระทำซ้าย: ลบเมื่อเป็น draft, หรือยกเลิกงานเมื่อเป็น completed */}
            {(() => {
              if (!editDraftData) return null;
              const isDraftRecord =
                editDraftData.isDraft ||
                (typeof editDraftData.id === 'string' && editDraftData.id.startsWith('draft_')) ||
                editDraftData.workflow_status === 'draft' ||
                editDraftData.workflow_status_id === 1;

              // กรณีเป็น Draft: แสดงปุ่มลบ
              if (isDraftRecord) {
                return (
                  <Button
                    variant="destructive"
                    onClick={() => onDeleteDraft(editDraftId)}
                    disabled={isSubmitting}
                    className={`bg-red-600 hover:bg-red-700 text-white ${cn}`}
                  >
                    {isSubmitting ? "กำลังลบ..." : "ลบ"}
                  </Button>
                );
              }

              // ถ้าเป็นงานบันทึกเสร็จสิ้น หรือพิมพ์แล้ว ให้แสดงปุ่มลบ
              const isCompletedOrPrintedRecord =
                editDraftData.workflow_status === 'completed' ||
                editDraftData.workflow_status === 'printed' ||
                editDraftData.workflow_status_id === 2 ||
                editDraftData.workflow_status_id === 3;
              if (isCompletedOrPrintedRecord && editDraftData.id) {
                return (
                  <Button
                    variant="destructive"
                    onClick={() => onDeleteWorkPlan(String(editDraftData.id))}
                    disabled={isSubmitting}
                    className={`bg-red-600 hover:bg-red-700 text-white ${cn}`}
                  >
                    {isSubmitting ? "กำลังลบ..." : "ลบ"}
                  </Button>
                );
              }

              return null;
            })()}
            <div className="flex gap-2">
              <Button variant="outline" onClick={onSaveDraft} disabled={isSubmitting} className={cn}>บันทึกแบบร่าง</Button>
              <Button onClick={onSaveComplete} disabled={isSubmitting} className={`bg-green-700 hover:bg-green-800 text-white ${cn}`}>
                {isSubmitting ? "กำลังบันทึก..." : "บันทึกเสร็จสิ้น"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

  );
}
