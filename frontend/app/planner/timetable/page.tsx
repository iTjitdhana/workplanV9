'use client'

import { useEffect, useMemo, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, ArrowLeft } from 'lucide-react'
import { TimeTablePopup } from '@/components/TimeTablePopup'
import { api } from '@/lib/api'
import { formatDateForDisplay } from '@/lib/dateUtils'

interface User {
  id: number | string
  name: string
}

interface ProductionItem {
  id: number | string
  job_code: string
  production_date: string
  workflow_status_id?: number | string
  isDraft?: boolean
}

function TimeTableContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dateParam = searchParams.get('date') || new Date().toISOString().slice(0, 10)

  const [users, setUsers] = useState<User[]>([])
  const [jobs, setJobs] = useState<ProductionItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const [usersRes, workPlansRes] = await Promise.all([
          api.getUsers(),
          api.getWorkPlans(dateParam),
        ])
        if (cancelled) return
        setUsers((usersRes as any)?.data || [])
        const rawJobs = ((workPlansRes as any)?.data || []) as any[]
        const normalizeTime = (t: any) => {
          if (!t) return ''
          const s = String(t)
          // Accept HH:mm or HH:mm:ss
          return s.length >= 5 ? s.slice(0,5) : s
        }
        const toNameArray = (ops: any): string[] => {
          if (!ops) return []
          if (Array.isArray(ops)) {
            // [{name},{id_code}] or ['แจ็ค','แมน']
            return ops.map((o:any) => (typeof o === 'string' ? o : (o?.name || o?.id_code))).filter(Boolean)
          }
          if (typeof ops === 'string') {
            return ops.split(/\s*,\s*/).filter(Boolean)
          }
          // operator1..4
          const cand = [ops.operator1, ops.operator2, ops.operator3, ops.operator4].filter(Boolean)
          return cand as string[]
        }
        const normalized = rawJobs.map(j => ({
          ...j,
          start_time: normalizeTime(j.start_time || j.startTime),
          end_time: normalizeTime(j.end_time || j.endTime),
          operators: (() => {
            // Prefer already-joined names from backend
            const joined = j.operators_from_join || j.operators
            if (typeof joined === 'string' && joined.trim().length > 0) return joined
            const arr = toNameArray(j.operator_names || j.operatorList)
            return arr.join(', ')
          })(),
        }))
        setJobs(normalized as any)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [dateParam])

  const titleDate = useMemo(() => {
    try {
      return formatDateForDisplay(new Date(dateParam), 'full')
    } catch {
      return dateParam
    }
  }, [dateParam])

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <Link href="/planner/home" className="text-sm text-blue-600 underline">
            กลับไปหน้า Workplan
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-green-600" />
            <span>ตารางเวลาการทำงาน - {titleDate}</span>
          </CardTitle>
        </CardHeader>
         <CardContent>
           {loading ? (
             <div className="text-center text-muted-foreground py-10">กำลังโหลด...</div>
           ) : (
            <TimeTablePopup
              open={true}
              onOpenChange={(open) => {
                if (!open) {
                  // ไปหน้า home พร้อมส่ง date parameter
                  router.push(`/planner/home?date=${encodeURIComponent(dateParam)}`);
                }
              }}
              selectedDate={dateParam}
              jobs={jobs as any}
              users={users as any}
            />
           )}
         </CardContent>
      </Card>
    </div>
  )
}

export default function TimeTablePage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto p-4">
        <div className="text-center text-muted-foreground py-10">กำลังโหลด...</div>
      </div>
    }>
      <TimeTableContent />
    </Suspense>
  )
}


