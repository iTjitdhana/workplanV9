"use client";

import dynamic from "next/dynamic";
import { Clock, PanelLeftClose, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { JobSearchSelect } from "@/components/JobSearchSelect";
import { SimpleDatePicker } from "@/components/SimpleDatePicker";
import type { RefObject } from "react";

const RichNoteEditor = dynamic(() => import("@/components/RichNoteEditor"), { ssr: false });

type UserLite = { id?: number | string; name: string; id_code?: string };
type MachineLite = { machine_code: string; machine_name: string };
type RoomLite = { room_code: string; room_name: string };

export type AddJobFormCardProps = {
  isFormCollapsed: boolean;
  onToggleCollapsed: () => void;
  selectedDate: string;
  onSelectedDateChange: (v: string) => void;
  jobQuery: string;
  onJobSelect: (jobCode: string, jobName: string) => void | Promise<void>;
  onAddNewJob: (jobName: string) => void;
  onClearForm: () => void;
  operators: string[];
  setOperators: (v: string[] | ((prev: string[]) => string[])) => void;
  users: UserLite[];
  startTime: string;
  setStartTime: (v: string) => void;
  endTime: string;
  setEndTime: (v: string) => void;
  selectedRoom: string;
  setSelectedRoom: (v: string) => void;
  selectedMachine: string;
  setSelectedMachine: (v: string) => void;
  note: string;
  onNoteChange: (v: string) => void;
  rooms: RoomLite[];
  machines: MachineLite[];
  timeOptions: string[];
  isSubmitting: boolean;
  autoFilledFields: Set<string>;
  setAutoFilledFields: (v: Set<string>) => void;
  shouldFocusFields: boolean;
  setShouldFocusFields: (v: boolean) => void;
  className?: string;
  operatorsRefs: RefObject<HTMLButtonElement | null>[];
  startTimeRef: RefObject<HTMLButtonElement | null>;
  endTimeRef: RefObject<HTMLButtonElement | null>;
  roomRef: RefObject<HTMLButtonElement | null>;
  onSaveDraft: () => void;
  onSubmit: () => void;
};

export function AddJobFormCard(props: AddJobFormCardProps) {
  const {
    isFormCollapsed,
    onToggleCollapsed,
    selectedDate,
    onSelectedDateChange,
    jobQuery,
    onJobSelect,
    onAddNewJob,
    onClearForm,
    operators,
    setOperators,
    users,
    startTime,
    setStartTime,
    endTime,
    setEndTime,
    selectedRoom,
    setSelectedRoom,
    selectedMachine,
    setSelectedMachine,
    note,
    onNoteChange,
    rooms,
    machines,
    timeOptions,
    isSubmitting,
    autoFilledFields,
    setAutoFilledFields,
    shouldFocusFields,
    setShouldFocusFields,
    className,
    operatorsRefs,
    startTimeRef,
    endTimeRef,
    roomRef,
    onSaveDraft,
    onSubmit,
  } = props;

  const cn = className || "";

  return (
            <Card className="shadow-lg bg-white h-fit">
              <CardHeader className="pb-3 sm:pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2 text-sm sm:text-base md:text-lg">
                    <UserIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                    <span className="leading-7 text-2xl">เพิ่มงานที่ต้องการผลิต</span>
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onToggleCollapsed}
                    className="text-white bg-green-600 hover:bg-green-700 border-2 border-green-500 rounded-full w-8 h-8 sm:w-10 sm:h-10 p-0 flex items-center justify-center flex-shrink-0 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    <PanelLeftClose className="w-4 h-4 sm:w-5 sm:h-5" />
                  </Button>
                </div>
              </CardHeader>

              {!isFormCollapsed && (
                <CardContent className="space-y-3 sm:space-y-4 md:space-y-6">
                  {/* Date Selection */}
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm font-bold text-gray-700">วันที่ผลิต</Label>
                    <SimpleDatePicker
                      value={selectedDate}
                      onChange={onSelectedDateChange}
                      placeholder="เลือกวันที่ผลิต"
                      className="w-full"
                    />
                  </div>

                  {/* Autocomplete Job Name/Code */}
                  <div className="space-y-2 relative">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs sm:text-sm font-bold text-gray-700">เพิ่มงานผลิต</Label>
                      <button
                        type="button"
                        onClick={onClearForm}
                        disabled={isSubmitting}
                        className="text-sm text-green-600 hover:text-green-700 underline disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        ล้างข้อมูลทั้งหมด
                      </button>
                    </div>
                    <div className="relative">
                      <JobSearchSelect
                        value={jobQuery}
                        onChange={onJobSelect}
                        onAddNew={onAddNewJob}
                        placeholder="ค้นหางานผลิต..."
                        isDisabled={isSubmitting}
                        allowAddNew={true}
                      />
                    </div>
                  </div>

                  {/* Staff Positions */}
                  <div className="space-y-3 sm:space-y-4">
                    <Label className="text-xs sm:text-sm font-bold text-gray-700">ผู้ปฏิบัติงาน (1-4 คน)</Label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      {[1, 2, 3, 4].map((position) => {
                        // กรองผู้ปฏิบัติงานที่เลือกแล้วในช่องอื่นๆ ออก
                        const selectedOperators = operators.filter((op, idx) => op && op !== "" && idx !== position - 1);
                        const availableUsers = users.filter(u => !selectedOperators.includes(u.name));
                        
                        // ตรวจสอบว่าช่องก่อนหน้ายังว่างอยู่หรือไม่ (สำหรับ validation)
                        const isPreviousEmpty = position > 1 && (!operators[position - 2] || operators[position - 2] === "");
                        const isDisabled = isPreviousEmpty;
                        
                        return (
                          <div key={position} className="space-y-1 sm:space-y-2">
                            <Label className={`text-xs text-gray-600 ${isDisabled ? 'text-gray-400' : ''}`}>
                              ผู้ปฏิบัติงาน {position}
                              {isDisabled && <span className="ml-1 text-xs text-gray-400">(ต้องกรอกคนที่ {position - 1} ก่อน)</span>}
                            </Label>
                            <Select
                              value={operators[position - 1] || "__none__"}
                              onValueChange={(val) => {
                                const newOps = [...operators];
                                const newValue = val === "__none__" ? "" : val;
                                newOps[position - 1] = newValue;
                                
                                // ถ้าเคลียร์ช่อง ให้เคลียร์ช่องถัดไปทั้งหมดด้วย
                                if (newValue === "") {
                                  for (let i = position; i < 4; i++) {
                                    newOps[i] = "";
                                  }
                                }
                                
                                setOperators(newOps);
                                // เมื่อผู้ใช้แก้ไข ให้ลบ focus
                                setShouldFocusFields(false);
                                setAutoFilledFields(new Set());
                              }}
                              disabled={isDisabled}
                            >
                              <SelectTrigger 
                                ref={operatorsRefs[position - 1] as any}
                                className={`h-8 sm:h-9 text-sm focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${shouldFocusFields && autoFilledFields.has('operators') && operators[position - 1] ? 'ring-2 ring-green-500 ring-offset-2' : ''} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                disabled={isDisabled}
                              >
                                <SelectValue placeholder={isDisabled ? "กรุณากรอกคนที่ " + (position - 1) + " ก่อน" : "เลือก"} />
                              </SelectTrigger>
                              <SelectContent className={cn}>
                                <SelectItem value="__none__" className={cn}>กรุณาเลือก</SelectItem>
                                {availableUsers.map(u => (
                                  <SelectItem key={u.id_code} value={u.name} className={cn}>{u.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Time Slots */}
                  {/* ซ่อนฟิลด์เครื่องบันทึกข้อมูลการผลิต */}
                  {/* <div className="space-y-3 sm:space-y-4">
                    <Label className="text-xs sm:text-sm font-bold text-gray-700">เครื่องบันทึกข้อมูลการผลิต</Label>
                    <Select
                      value={selectedMachine || "__none__"}
                      onValueChange={val => setSelectedMachine(val === "__none__" ? "" : val)}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="เลือก..." />
                      </SelectTrigger>
                      <SelectContent className={cn}>
                        <SelectItem value="__none__" className={cn}>กรุณาเลือก</SelectItem>
                        {machines.map(m => (
                          <SelectItem key={m.machine_code} value={m.machine_code} className={cn}>{m.machine_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div> */}

                  {/* Time Range */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs sm:text-sm font-bold text-gray-700">เวลาเริ่ม</Label>
                      <div className="relative">
                        <div className="relative">
                          <Select value={startTime || "__none__"} onValueChange={val => {
                            const newStartTime = val === "__none__" ? "" : val;
                            setStartTime(newStartTime);
                            
                            // ถ้าเปลี่ยนเวลาเริ่ม และเวลาสิ้นสุดปัจจุบันน้อยกว่าหรือเท่ากับเวลาเริ่มใหม่ ให้เคลียร์เวลาสิ้นสุด
                            if (newStartTime && endTime && endTime <= newStartTime) {
                              setEndTime("");
                            }
                            
                            // เมื่อผู้ใช้แก้ไข ให้ลบ focus
                            setShouldFocusFields(false);
                            setAutoFilledFields(new Set());
                          }}>
                            <SelectTrigger 
                              ref={startTimeRef as any}
                              className={`text-sm pl-8 ${shouldFocusFields && autoFilledFields.has('startTime') && startTime ? 'ring-2 ring-green-500 ring-offset-2' : ''}`}
                            >
                              <SelectValue placeholder="เลือกเวลาเริ่ม..." />
                            </SelectTrigger>
                            <SelectContent className={cn}>
                              <SelectItem value="__none__" className={cn}>เลือกเวลาเริ่ม...</SelectItem>
                              {timeOptions.map(t => (
                                <SelectItem key={t} value={t} className={cn}>{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs sm:text-sm font-bold text-gray-700">เวลาสิ้นสุด</Label>
                      <div className="relative">
                        <div className="relative">
                          <Select value={endTime || "__none__"} onValueChange={val => {
                            setEndTime(val === "__none__" ? "" : val);
                            // เมื่อผู้ใช้แก้ไข ให้ลบ focus
                            setShouldFocusFields(false);
                            setAutoFilledFields(new Set());
                          }}>
                            <SelectTrigger 
                              ref={endTimeRef as any}
                              className={`text-sm pl-8 ${shouldFocusFields && autoFilledFields.has('endTime') && endTime ? 'ring-2 ring-green-500 ring-offset-2' : ''}`}
                            >
                              <SelectValue placeholder="เลือกเวลาสิ้นสุด..." />
                            </SelectTrigger>
                            <SelectContent className={cn}>
                              <SelectItem value="__none__" className={cn}>เลือกเวลาสิ้นสุด...</SelectItem>
                              {timeOptions
                                .filter(t => {
                                  // ถ้ามีเวลาเริ่ม ให้แสดงเฉพาะเวลาที่มากกว่าเวลาเริ่ม
                                  if (startTime && t <= startTime) {
                                    return false;
                                  }
                                  return true;
                                })
                                .map(t => (
                                  <SelectItem key={t} value={t} className={cn}>{t}</SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm font-bold text-gray-700">หมายเหตุ</Label>
                    <RichNoteEditor
                      value={note}
                      onChange={(v: string) => onNoteChange(v)}
                      className="text-sm"
                      placeholder="เพิ่มหมายเหตุเพิ่มเติมสำหรับการผลิต..."
                    />
                  </div>

                  {/* ห้องผลิต (dropdown จริง ใต้เวลาเริ่ม-สิ้นสุด) */}
                  <div className="space-y-2 mt-2">
                    <Label className="text-xs sm:text-sm font-bold text-gray-700">ห้องผลิต</Label>
                    <Select
                      value={selectedRoom || "__none__"}
                      onValueChange={val => {
                        setSelectedRoom(val === "__none__" ? "" : val);
                        // เมื่อผู้ใช้แก้ไข ให้ลบ focus
                        setShouldFocusFields(false);
                        setAutoFilledFields(new Set());
                      }}
                    >
                      <SelectTrigger 
                        ref={roomRef as any}
                        className={`text-sm ${shouldFocusFields && autoFilledFields.has('room') && selectedRoom ? 'ring-2 ring-green-500 ring-offset-2' : ''}`}
                      >
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

                  {/* Submit Buttons */}
                  <div className="pt-4 sm:pt-6">
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                      <Button
                        variant="outline"
                        className="flex-1 border-2 border-gray-400 text-gray-700 hover:bg-gray-100 bg-white text-sm font-medium py-2 px-4"
                        onClick={onSaveDraft}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "กำลังบันทึก..." : "บันทึกแบบร่าง"}
                      </Button>
                      <Button
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-4 shadow-md"
                        onClick={onSubmit}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "กำลังบันทึก..." : "บันทึกเสร็จสิ้น"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

  );
}
