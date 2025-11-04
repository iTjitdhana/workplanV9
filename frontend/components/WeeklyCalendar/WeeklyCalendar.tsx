"use client"

import React, { useMemo } from "react"
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, closestCorners, useDroppable } from "@dnd-kit/core"
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { ChevronLeft, ChevronRight, FileText, Printer, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SortableItem } from "../dnd/SortableItem"
import { WeeklyCalendarProps, ProductionTask } from "@/lib/types/weekly-calendar"
import { useWeeklyCalendar } from "@/hooks/useWeeklyCalendar"

const DroppableColumn: React.FC<{ id: string; dataLength: number; children: React.ReactNode }> = ({ id, dataLength, children }) => {
  const { setNodeRef, isOver } = useDroppable({ id, data: { container: [id, dataLength] } })
  return (
    <div ref={setNodeRef} className={`border border-gray-200 rounded-lg p-2 bg-white min-h-[680px] sm:min-h-[800px] ${isOver ? "ring-2 ring-blue-400 ring-offset-2" : ""}`}>
      {children}
    </div>
  )
}

function StatusIcon({ status }: { status: string | undefined }) {
  if (!status) return <FileText className="w-3.5 h-3.5 text-gray-500" />
  if (status === "พิมพ์แล้ว") return <Printer className="w-3.5 h-3.5 text-blue-500" />
  if (status === "บันทึกเสร็จสิ้น") return <Save className="w-3.5 h-3.5 text-green-600" />
  if (status === "แบบร่าง") return <FileText className="w-3.5 h-3.5 text-gray-400" />
  return <FileText className="w-3.5 h-3.5 text-gray-500" />
}

function borderLeftColor(status?: string, workflowText?: string) {
  const w = (workflowText || "").toLowerCase()
  if (w.includes("ยกเลิก")) return "border-l-4 border-l-red-500"
  if (w.includes("เสร็จสิ้น") || w.includes("สำเร็จ")) return "border-l-4 border-l-green-500"
  // check pending BEFORE in-progress to avoid substring match on "ดำเนินการ"
  if (w.includes("รอดำเนินการ") || w.includes("รอ")) return "border-l-4 border-l-gray-400"
  if (w.includes("กำลัง") || w.includes("ดำเนินการ")) return "border-l-4 border-l-yellow-400"
  // fallback by save status
  if (status === "พิมพ์แล้ว") return "border-l-4 border-l-blue-500"
  if (status === "บันทึกเสร็จสิ้น") return "border-l-4 border-l-green-500"
  if (status === "แบบร่าง" || status === "บันทึกแบบร่าง") return "border-l-4 border-l-gray-400"
  return "border-l-4 border-l-gray-300"
}

function deriveSaveStatus(item: any): string | undefined {
  // Map backend fields to the three display statuses used for badges
  const w = item?.workflow_status_id
  const record = item?.recordStatus
  if (w === 2 || w === "2") return "บันทึกเสร็จสิ้น"
  if (w === 1 || w === "1") return "แบบร่าง"
  if (record === "บันทึกสำเร็จ" || record === "พิมพ์แล้ว") return "พิมพ์แล้ว"
  if (!item?.isDraft && w && w !== 2) return "พิมพ์แล้ว"
  return undefined
}

function statusBadge(status?: string) {
  const base = "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium border"
  if (status === "พิมพ์แล้ว") return <span className={`${base} bg-blue-50 text-blue-700 border-blue-200`}><Printer className="w-3 h-3"/>พิมพ์แล้ว</span>
  if (status === "บันทึกเสร็จสิ้น") return <span className={`${base} bg-green-50 text-green-700 border-green-200`}><Save className="w-3 h-3"/>บันทึกเสร็จสิ้น</span>
  if (status === "แบบร่าง" || status === "บันทึกแบบร่าง") return <span className={`${base} bg-gray-50 text-gray-600 border-gray-200`}><FileText className="w-3 h-3"/>บันทึกแบบร่าง</span>
  return null
}

// Helper function to format date
const formatDateForAPI = (date: Date) => {
  return date.toISOString().split('T')[0]
}

export const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({
  productionData,
  currentWeek,
  onWeekChange,
  onTaskMove,
  onTaskReorder,
  onTaskClick,
  onDateClick,
  onAddTask,
  showWeekNavigation = true,
  showTaskCount = true,
  className = ""
}) => {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  
  const {
    weekDates,
    weekRange,
    weekProduction,
    totalWeekTasks,
    getDayTaskCount,
    getTasksForDate,
    getWeeklyTableBackgroundColor
  } = useWeeklyCalendar(currentWeek, productionData)

  // Group tasks by date
  const dayJobs: Record<string, ProductionTask[]> = useMemo(() => {
    const jobs: Record<string, ProductionTask[]> = {}
    weekDates.forEach(d => {
      const key = formatDateForAPI(d.date)
      jobs[key] = getTasksForDate(key)
    })
    return jobs
  }, [weekDates, getTasksForDate])

  const dayKeys = useMemo(() => weekDates.map(d => formatDateForAPI(d.date)), [weekDates])

  // Deterministic header colors (avoid relying on external hook color mapping)
  const getHeaderBg = (date: Date) => {
    const idx = date.getDay()
    switch (idx) {
      case 1: return "bg-yellow-200"
      case 2: return "bg-pink-200"
      case 3: return "bg-green-200"
      case 4: return "bg-orange-200"
      case 5: return "bg-sky-200"
      case 6: return "bg-violet-200"
      default: return "bg-gray-100"
    }
  }

  // Lighter background for empty slots matching the column tone
  const getEmptyBg = (date: Date) => {
    const idx = date.getDay()
    switch (idx) {
      case 1: return "bg-yellow-50"
      case 2: return "bg-pink-50"
      case 3: return "bg-green-50"
      case 4: return "bg-orange-50"
      case 5: return "bg-sky-50"
      case 6: return "bg-violet-50"
      default: return "bg-gray-50"
    }
  }

  const emptyBgByKey: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {}
    weekDates.forEach((d) => {
      const key = formatDateForAPI(d.date)
      map[key] = getEmptyBg(d.date)
    })
    return map
  }, [weekDates])

  // Unified slot height (reserve space equal to ~3 lines)
  const SLOT_HEIGHT = "h-[96px]" // ~4 text lines with paddings

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const [fromKey, activeIdx] = (active?.data?.current as any)?.container || []
    const [toKey, overIdxRaw] = (over?.data?.current as any)?.container || []
    const toIndex = typeof overIdxRaw === "number" ? overIdxRaw : 0

    if (!fromKey || !toKey) return
    const item = dayJobs[fromKey]?.[activeIdx]
    if (!item) return

    // Block moving printed items
    if (item.recordStatus === "พิมพ์แล้ว") return

    if (fromKey === toKey) {
      // Same day reorder
      onTaskReorder(item.id, fromKey, activeIdx, toIndex)
    } else {
      // Move across days
      onTaskMove(item.id, fromKey, toKey, activeIdx, toIndex)
    }
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(currentWeek)
    newWeek.setDate(currentWeek.getDate() + (direction === 'next' ? 7 : -7))
    onWeekChange(newWeek)
  }

  const isPrinted = (item: ProductionTask) => item.recordStatus === "พิมพ์แล้ว"

  return (
    <div className={`space-y-2 sm:space-y-3 md:space-y-4 ${className}`}>
      {/* Week Navigation */}
      {showWeekNavigation && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateWeek("prev")}
            className="flex items-center justify-center space-x-1 text-xs sm:text-sm"
          >
            <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">สัปดาห์ก่อนหน้า</span>
            <span className="sm:hidden">ก่อน</span>
          </Button>
          <div className="text-center">
            <h3 className="font-medium text-gray-900 text-sm sm:text-base">
              {weekRange}
            </h3>
            {showTaskCount && (
              <p className="text-gray-600 mt-1 text-xs">
                รวมงานทั้งสัปดาห์: {totalWeekTasks} งาน
              </p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateWeek("next")}
            className="flex items-center justify-center space-x-1 text-xs sm:text-sm"
          >
            <span className="hidden sm:inline">สัปดาห์ถัดไป</span>
            <span className="sm:hidden">หน้า</span>
            <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
          </Button>
        </div>
      )}

      {/* Weekly Calendar Grid */}
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto">
          <div className="grid grid-cols-[56px_repeat(6,minmax(0,1fr))] sm:grid-cols-[64px_repeat(6,minmax(0,1fr))] gap-y-1 gap-x-0">
            <div className="rounded-lg p-2 bg-gray-100 text-center font-semibold text-gray-700 border border-gray-200">งานที่</div>
            {weekDates.map((weekDate, idx) => (
              <div key={idx} className={`${getHeaderBg(weekDate.date)} rounded-lg p-2 text-center border border-gray-200`}>
                <div className="text-base sm:text-lg font-bold mb-1">{weekDate.dayName}</div>
                <div className="flex items-center justify-center space-x-1">
                  <div className="font-semibold">{weekDate.dayNumber}</div>
                  <div className="opacity-90">{weekDate.date.toLocaleDateString("th-TH", { month: "short" })}</div>
                </div>
                <div className="mt-1 text-xs opacity-80">
                  {getDayTaskCount(weekDate.dateStr)} งาน
                </div>
                {onAddTask && (
                  <button
                    className="mt-2 text-xs px-2 py-1 bg-white/70 hover:bg-white rounded border border-white/40"
                    onClick={() => onAddTask && onAddTask(weekDate.dateStr, 0)}
                  >
                    + เพิ่มงาน
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[56px_repeat(6,minmax(0,1fr))] sm:grid-cols-[64px_repeat(6,minmax(0,1fr))] gap-y-1 gap-x-0 mt-2">
            <div className="rounded-lg p-2 bg-white border border-gray-200 text-center select-none">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className={`${SLOT_HEIGHT} flex items-center justify-center text-gray-700 font-medium text-sm border-b last:border-b-0`}>
                  {i + 1}
                </div>
              ))}
            </div>
            {dayKeys.map((key) => (
              <DroppableColumn key={key} id={key} dataLength={(dayJobs[key] || []).length}>
                <SortableContext items={(dayJobs[key] || []).map((_, i) => `${key}-${i}`)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {Array.from({ length: 20 }).map((_, rowIdx) => {
                      const task = (dayJobs[key] || [])[rowIdx]
                      if (!task) {
                        return (
                          <div
                            key={rowIdx}
                            className={`${SLOT_HEIGHT} border border-dashed border-gray-200 rounded ${emptyBgByKey[key]} flex items-center justify-center`}
                          >
                            <span className="text-xs text-gray-400">ไม่มีงานผลิต</span>
                          </div>
                        )
                      }
                      
                      const status = task.recordStatus || task.status
                      const workflow = task.status
                      const noteText = (task as any).notes ?? (task as any).note
                      
                      return (
                    <SortableItem key={`${key}-${rowIdx}`} id={`${key}-${rowIdx}`} container={[key, rowIdx]} disabled={isPrinted(task)}>
                          <button
                            onClick={() => onTaskClick && onTaskClick(task)}       
                        className={`w-full text-left bg-white rounded-r-lg border border-gray-200 shadow-md hover:shadow-lg hover:scale-[1.02] transition transform ${SLOT_HEIGHT} p-2 sm:p-2 overflow-hidden ${isPrinted(task) ? "opacity-80 cursor-not-allowed" : "cursor-move"} ${borderLeftColor(status, workflow)}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="font-bold text-gray-800 text-base sm:text-[15px] truncate pr-2">{task.title}</div>
                            </div>
                            {/* Show notes if available */}
                            {noteText && (
                              <div className="mt-1 text-[12px] sm:text-[13px] text-red-600 leading-snug line-clamp-2">
                                หมายเหตุ: {noteText}
                              </div>
                            )}
                            <div className="mt-1">{statusBadge(status)}</div>
                          </button>
                        </SortableItem>
                      )
                    })}
                  </div>
                </SortableContext>
              </DroppableColumn>
            ))}
          </div>
        </div>
      </DndContext>
    </div>
  )
}

export default WeeklyCalendar
