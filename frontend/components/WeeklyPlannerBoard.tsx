"use client"

import React, { useMemo } from "react"
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, closestCorners, useDroppable } from "@dnd-kit/core"
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { FileText, Printer, Save } from "lucide-react"
import { SortableItem } from "./dnd/SortableItem"
import type { ProductionItem } from "@/types/production"
import { formatDateForAPI } from "@/lib/dateUtils"

export type DayKey = string // yyyy-MM-dd

export interface WeeklyPlannerBoardProps {
  weekDates: Date[]
  dayJobs: Record<DayKey, ProductionItem[]>
  onReorderSameDay?: (dateKey: DayKey, newOrder: ProductionItem[]) => void
  onMoveAcrossDays?: (fromKey: DayKey, toKey: DayKey, item: ProductionItem, position: number) => void
  isPrinted?: (item: ProductionItem) => boolean
  onSelectJob?: (item: ProductionItem) => void
  onAddJob?: (dateKey: DayKey) => void
  getDayBackgroundColor: (date: Date) => string
  getDayTextColor: (date: Date) => string
  getDayName: (date: Date) => string
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

const DroppableColumn: React.FC<{ id: string; dataLength: number; children: React.ReactNode }> = ({ id, dataLength, children }) => {
  const { setNodeRef, isOver } = useDroppable({ id, data: { container: [id, dataLength] } })
  return (
    <div ref={setNodeRef} className={`border border-gray-200 rounded-lg p-2 bg-white min-h-[680px] sm:min-h-[800px] ${isOver ? "ring-2 ring-blue-400 ring-offset-2" : ""}`}>
      {children}
    </div>
  )
}

function statusBadge(status?: string) {
  const base = "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium border"
  if (status === "พิมพ์แล้ว") return <span className={`${base} bg-blue-50 text-blue-700 border-blue-200`}><Printer className="w-3 h-3"/>พิมพ์แล้ว</span>
  if (status === "บันทึกเสร็จสิ้น") return <span className={`${base} bg-green-50 text-green-700 border-green-200`}><Save className="w-3 h-3"/>บันทึกเสร็จสิ้น</span>
  if (status === "แบบร่าง" || status === "บันทึกแบบร่าง") return <span className={`${base} bg-gray-50 text-gray-600 border-gray-200`}><FileText className="w-3 h-3"/>บันทึกแบบร่าง</span>
  return null
}

export const WeeklyPlannerBoard: React.FC<WeeklyPlannerBoardProps> = ({
  weekDates,
  dayJobs,
  onReorderSameDay,
  onMoveAcrossDays,
  isPrinted,
  onSelectJob,
  onAddJob,
  getDayBackgroundColor,
  getDayTextColor,
  getDayName,
}) => {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const dayKeys = useMemo(() => weekDates.map(d => formatDateForAPI(d)), [weekDates])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const [fromKey, activeIdx] = (active?.data?.current as any)?.container || []
    const [toKey, overIdxRaw] = (over?.data?.current as any)?.container || []
    const toIndex = typeof overIdxRaw === "number" ? overIdxRaw : 0

    if (!fromKey || !toKey) return
    const item = dayJobs[fromKey]?.[activeIdx]
    if (!item) return
    if (isPrinted && isPrinted(item)) return // block moving printed

    if (fromKey === toKey) {
      const newOrder = arrayMove(dayJobs[fromKey], activeIdx, toIndex)
      onReorderSameDay && onReorderSameDay(fromKey, newOrder)
    } else {
      onMoveAcrossDays && onMoveAcrossDays(fromKey, toKey, item, toIndex)
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-7 gap-1">
        <div className="rounded-lg p-2 bg-gray-100 text-center font-semibold text-gray-700">งานที่</div>
        {weekDates.map((date, idx) => (
          <div key={idx} className={`${getDayBackgroundColor(date)} rounded-lg p-2 text-center`}>
            <div className={`text-base sm:text-lg font-bold ${getDayTextColor(date)} mb-1`}>{getDayName(date)}</div>
            <div className={`flex items-center justify-center space-x-1 ${getDayTextColor(date)}`}>
              <div className="font-semibold">{date.getDate()}</div>
              <div className="opacity-90">{date.toLocaleDateString("th-TH", { month: "short" })}</div>
            </div>
            <div className={`mt-1 text-xs ${getDayTextColor(date)} opacity-80`}>
              {(dayJobs[formatDateForAPI(date)] || []).length} งาน
            </div>
            {onAddJob && (
              <button
                className="mt-2 text-xs px-2 py-1 bg-white/70 hover:bg-white rounded border border-white/40"
                onClick={() => onAddJob && onAddJob(formatDateForAPI(date))}
              >
                + เพิ่มงาน
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 mt-2">
        <div className="rounded-lg p-2 bg-white border border-gray-200 text-center select-none w-20 sm:w-24">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="h-12 flex items-center justify-center text-gray-700 font-medium text-sm border-b last:border-b-0">
              {i + 1}
            </div>
          ))}
        </div>
        {dayKeys.map((key) => (
          <DroppableColumn key={key} id={key} dataLength={(dayJobs[key] || []).length}>
            <SortableContext items={(dayJobs[key] || []).map((_, i) => `${key}-${i}`)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {Array.from({ length: 20 }).map((_, rowIdx) => {
                  const job = (dayJobs[key] || [])[rowIdx]
                  if (!job) {
                    return <div key={rowIdx} className="h-8 border border-dashed border-blue-100 rounded bg-blue-50/20"></div>
                  }
                  const status = deriveSaveStatus(job) || (job as any).status_name || (job as any).recordStatus
                  const workflow = (job as any).status_name || (job as any).recordStatus
                  return (
                    <SortableItem key={`${key}-${rowIdx}`} id={`${key}-${rowIdx}`} container={[key, rowIdx]} disabled={isPrinted?.(job)}>
                      <button
                        onClick={() => onSelectJob && onSelectJob(job)}       
                        className={`w-full text-left bg-white rounded-r-lg border border-gray-200 shadow-md hover:shadow-lg hover:scale-[1.02] transition transform min-h-[50px] p-2 sm:p-2 ${isPrinted?.(job) ? "opacity-80 cursor-not-allowed" : "cursor-move"} ${borderLeftColor(status, workflow)}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-bold text-gray-800 text-base sm:text-[15px] truncate pr-2">{job.job_name}</div>
                        </div>
                        {/* time/room and avatars intentionally omitted per spec */}
                        {((job as any).note || (job as any).notes) && (
                           <div className="mt-1 text-[12px] sm:text-[13px] text-red-600 leading-snug line-clamp-2">หมายเหตุ: {(job as any).note || (job as any).notes}</div>
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
    </DndContext>
  )
}

export default WeeklyPlannerBoard


