"use client";

import { BarChart3, ChevronDown, ChevronUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DailySummary } from "@/lib/dailySummary";

type Props = {
  summary: DailySummary | null;
  staffImages: Record<string, string>;
  showWorkerDetails: boolean;
  onToggleWorkerDetails: () => void;
  onOpenTimetable: () => void;
};

function formatHoursMinutes(hoursDecimal: number): string {
  const totalMinutes = Math.round(hoursDecimal * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) return `${hours} ชั่วโมง`;
  return `${hours} ชั่วโมง ${minutes} นาที`;
}

export function StaffingDashboardCard({
  summary,
  staffImages,
  showWorkerDetails,
  onToggleWorkerDetails,
  onOpenTimetable,
}: Props) {
  return (
<Card className="shadow-lg bg-white">
                <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <CardTitle className="flex items-center space-x-2 text-sm sm:text-base md:text-lg">
                    <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                    <span>Dashboard การลงคนลงเวลา</span>
                  </CardTitle>
                  <Button
                      variant="outline"
                      size="sm"
                      onClick={onOpenTimetable}
                      className="text-xs px-2 py-1 whitespace-nowrap border-blue-300 text-blue-600 hover:bg-blue-50"
                    >
                      แสดงตารางเวลาการทำงาน
                    </Button>
                </CardHeader>
                <CardContent>
                  {summary ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                              <div className="text-blue-600 font-medium">วันนี้มีผู้ปฏิบัติงาน</div>
                              <div className="text-2xl font-bold text-blue-700">{summary.totalWorkers} คน</div>
                            </div>
                            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                              <div className="text-green-600 font-medium">ชั่วโมงการทำงานทั้งหมดของวันนี้</div>
                              <div className="text-2xl font-bold text-green-700">
                                {(() => {
                                  // แปลงชั่วโมงทศนิยมเป็นชั่วโมงและนาที
                                  // เช่น 8.25 ชั่วโมง = 8 ชั่วโมง 15 นาที
                                  const totalMinutes = Math.round(summary.totalWorkHours * 60);
                                  const hours = Math.floor(totalMinutes / 60);
                                  const minutes = totalMinutes % 60;
                                  if (minutes === 0) {
                                    return `${hours} ชั่วโมง`;
                                  } else {
                                    return `${hours} ชั่วโมง ${minutes} นาที`;
                                  }
                                })()}
                              </div>
                              <div className="text-xs text-green-600 mt-1">(หักพักเที่ยง 45 นาที)</div>
                            </div>
                            <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                              <div className="text-orange-600 font-medium">เวลาที่ใช้ลงงาน</div>
                              <div className="text-2xl font-bold text-orange-700">
                                {(() => {
                                  // แปลงชั่วโมงทศนิยมเป็นชั่วโมงและนาที
                                  // เช่น 1.5 ชั่วโมง = 1 ชั่วโมง 30 นาที
                                  const totalMinutes = Math.round(summary.totalUsedTime * 60);
                                  const hours = Math.floor(totalMinutes / 60);
                                  const minutes = totalMinutes % 60;
                                  if (minutes === 0) {
                                    return `${hours} ชั่วโมง`;
                                  } else {
                                    return `${hours} ชั่วโมง ${minutes} นาที`;
                                  }
                                })()}
                              </div>
                              <div className="text-xs text-orange-600 mt-1">(หักพักเที่ยง 45 นาที)</div>
                            </div>
                            <div className={`p-3 rounded-lg border ${
                              summary.capacityPercentage > 100 
                                ? 'bg-red-50 border-red-200' 
                                : summary.capacityPercentage >= 80 
                                  ? 'bg-green-50 border-green-200'
                                  : 'bg-yellow-50 border-yellow-200'
                            }`}>
                              <div className={`font-medium ${
                                summary.capacityPercentage > 100 
                                  ? 'text-red-600' 
                                  : summary.capacityPercentage >= 80 
                                    ? 'text-green-600'
                                    : 'text-yellow-600'
                              }`}>Capacity</div>
                              <div className={`text-2xl font-bold ${
                                summary.capacityPercentage > 100 
                                  ? 'text-red-700' 
                                  : summary.capacityPercentage >= 80 
                                    ? 'text-green-700'
                                    : 'text-yellow-700'
                              }`}>
                                {summary.capacityPercentage.toFixed(1)}%
                              </div>
                            </div>
                          </div>
                          
                          {/* รายชื่อผู้ปฏิบัติงาน */}
                          <div className="bg-gray-50 p-3 rounded-lg border">
                            <div className="text-gray-600 font-bold text-base mb-2">รายชื่อผู้ปฏิบัติงาน ({summary.totalWorkers} คน)</div>
                            <div className="text-sm text-gray-700">
                              {summary.uniqueWorkers.join(', ')}
                            </div>
                          </div>

                          {/* คนที่ยังรับงานได้ - แสดงเฉพาะเมื่อมีคนว่าง */}
                          {summary.availableWorkers.length > 0 && (
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                              <div className="text-blue-600 font-medium mb-2">ผู้ปฏิบัติงานหลักที่ว่าง ({summary.availableWorkers.length} คน)</div>
                              <div className="text-sm text-blue-700">
                                {summary.availableWorkers.join(', ')}
                              </div>
                            </div>
                          )}

                          {/* รายละเอียดของแต่ละคน */}
                          <div 
                            className="bg-gray-50 p-3 rounded-lg border cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => onToggleWorkerDetails()}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-gray-600 font-medium">รายละเอียดการทำงานของแต่ละคน</div>
                              {/* ลบปุ่มแสดงตารางเวลาการทำงานออก เหลือแค่ปุ่ม toggle รายละเอียด */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation(); // ป้องกันการ trigger onClick ของ parent
                                  onToggleWorkerDetails();
                                }}
                                className="p-1 h-6 w-6"
                              >
                                {showWorkerDetails ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                            {showWorkerDetails && (
                              <div className="space-y-2">
                                {/* แสดงคนที่ยังรับงานได้ก่อน */}
                                {summary.workerDetails.filter(worker => worker.status === 'available').length > 0 && (
                                  <div className="text-xs font-semibold text-green-700 mb-2">🟢 คนที่ยังรับงานได้</div>
                                )}
                                {summary.workerDetails
                                  .filter(worker => worker.status === 'available')
                                  .map((worker, index) => (
                                <div key={index} className={`p-3 rounded border text-xs ${
                                  worker.status === 'full' 
                                    ? 'bg-red-50 border-red-200'
                                    : worker.status === 'limited'
                                      ? 'bg-yellow-50 border-yellow-200'
                                      : 'bg-green-50 border-green-200'
                                }`}>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                      <Avatar className="w-8 h-8">
                                        <AvatarImage
                                          src={staffImages[worker.name] || "/placeholder-user.jpg"}
                                          alt={worker.name}
                                          className="object-cover object-center"
                                        />
                                        <AvatarFallback className="text-xs font-medium bg-green-100 text-green-800">
                                          {worker.name.substring(0, 2)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="font-medium text-sm">{worker.name}</span>
                                    </div>
                                    <span className={`font-bold text-sm ${
                                      worker.status === 'full' 
                                        ? 'text-red-600'
                                        : worker.status === 'limited'
                                          ? 'text-yellow-600'
                                          : 'text-green-600'
                                    }`}>
                                      {worker.displayText}
                                    </span>
                                  </div>
                                </div>
                                ))}
                                
                                {/* แสดงคนที่ใกล้เต็มเวลา */}
                                {summary.workerDetails.filter(worker => worker.status === 'limited').length > 0 && (
                                  <div className="text-xs font-semibold text-yellow-700 mb-2 mt-4">🟡 คนที่ใกล้เต็มเวลา</div>
                                )}
                                {summary.workerDetails
                                  .filter(worker => worker.status === 'limited')
                                  .map((worker, index) => (
                                    <div key={`limited-${index}`} className={`p-3 rounded border text-xs ${
                                      worker.status === 'full' 
                                        ? 'bg-red-50 border-red-200'
                                        : worker.status === 'limited'
                                          ? 'bg-yellow-50 border-yellow-200'
                                          : 'bg-green-50 border-green-200'
                                    }`}>
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                          <Avatar className="w-8 h-8">
                                            <AvatarImage
                                              src={staffImages[worker.name] || "/placeholder-user.jpg"}
                                              alt={worker.name}
                                              className="object-cover object-center"
                                            />
                                            <AvatarFallback className="text-xs font-medium bg-green-100 text-green-800">
                                              {worker.name.substring(0, 2)}
                                            </AvatarFallback>
                                          </Avatar>
                                          <span className="font-medium text-sm">{worker.name}</span>
                                        </div>
                                        <span className={`font-bold text-sm ${
                                          worker.status === 'full' 
                                            ? 'text-red-600'
                                            : worker.status === 'limited'
                                              ? 'text-yellow-600'
                                              : 'text-green-600'
                                        }`}>
                                          {worker.displayText}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                
                                {/* แสดงคนที่เต็มเวลา */}
                                {summary.workerDetails.filter(worker => worker.status === 'full').length > 0 && (
                                  <div className="text-xs font-semibold text-red-700 mb-2 mt-4">🔴 คนที่เต็มเวลา</div>
                                )}
                                {summary.workerDetails
                                  .filter(worker => worker.status === 'full')
                                  .map((worker, index) => (
                                    <div key={`full-${index}`} className={`p-3 rounded border text-xs ${
                                      worker.status === 'full' 
                                        ? 'bg-red-50 border-red-200'
                                        : worker.status === 'limited'
                                          ? 'bg-yellow-50 border-yellow-200'
                                          : 'bg-green-50 border-green-200'
                                    }`}>
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                          <Avatar className="w-8 h-8">
                                            <AvatarImage
                                              src={staffImages[worker.name] || "/placeholder-user.jpg"}
                                              alt={worker.name}
                                              className="object-cover object-center"
                                            />
                                            <AvatarFallback className="text-xs font-medium bg-green-100 text-green-800">
                                              {worker.name.substring(0, 2)}
                                            </AvatarFallback>
                                          </Avatar>
                                          <span className="font-medium text-sm">{worker.name}</span>
                                        </div>
                                        <span className={`font-bold text-sm ${
                                          worker.status === 'full' 
                                            ? 'text-red-600'
                                            : worker.status === 'limited'
                                              ? 'text-yellow-600'
                                              : 'text-green-600'
                                        }`}>
                                          {worker.displayText}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>

                          {/* Status Indicator */}
                          <div className="bg-gray-50 p-3 rounded-lg border">
                            <div className="text-gray-600 font-medium mb-2">สถานะการลงคนลงเวลา</div>
                            <div className={`text-sm font-medium p-2 rounded ${
                              summary.capacityPercentage > 100 
                                ? 'text-red-700 bg-red-100 border border-red-200' 
                                : summary.capacityPercentage >= 80 
                                  ? 'text-green-700 bg-green-100 border border-green-200'
                                  : 'text-yellow-700 bg-yellow-100 border border-yellow-200'
                            }`}>
                              {summary.capacityPercentage > 100 
                                ? '⚠️ เกินความสามารถ (เกิน 100%) - ควรเพิ่มคนหรือลดงาน' 
                                : summary.capacityPercentage >= 80 
                                  ? '✅ การลงคนลงเวลาสมบูรณ์ (80-100%) - ใช้งานเต็มที่'
                                  : '⚡ การลงคนลงเวลาต่ำ (ต่ำกว่า 80%) - ควรเพิ่มงานหรือลดคน'
                              }
                            </div>
                          </div>
                        </div>
                      ) : (
                          <div className="text-center py-8 text-gray-500">
                            <p>ไม่สามารถคำนวณข้อมูล Dashboard ได้</p>
                            <p className="text-sm mt-2">กรุณาลองใหม่อีกครั้ง</p>
                          </div>
                      )}
                </CardContent>
              </Card>
  );
}
