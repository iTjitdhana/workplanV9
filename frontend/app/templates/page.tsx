'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Clock, Building2, Wrench, Users, Calendar } from 'lucide-react';

interface RecentWorkPlan {
  id: number;
  production_date: string;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  room: {
    code: string;
    name: string;
  } | null;
  machine: {
    code: string;
    name: string;
  } | null;
  operators: string[];
}

interface FrequentJob {
  job_code: string;
  job_name: string;
  frequency: number;
  first_date: string;
  last_date: string;
  most_common_time: string | null;
  most_common_room: string | null;
  most_common_machine: string | null;
  recentWorkPlans: RecentWorkPlan[];
}

interface Statistics {
  total_unique_jobs: number;
  total_work_plans: number;
  jobs_10plus: number;
  jobs_5to9: number;
  jobs_3to4: number;
}

export default function TemplatesPage() {
  const [jobs, setJobs] = useState<FrequentJob[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [minFrequency, setMinFrequency] = useState(3);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const loadFrequentJobs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/work-plans/frequent-jobs?minFrequency=${minFrequency}&limit=50`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('HTTP Error:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setJobs(data.data.jobs || []);
        setStatistics(data.data.statistics);
      } else {
        console.error('Error loading frequent jobs:', data.message);
      }
    } catch (error: any) {
      console.error('Error fetching frequent jobs:', error);
      console.error('Error details:', error.message, error.cause);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFrequentJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minFrequency]);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-2 text-lg">กำลังโหลดข้อมูล...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">งานที่ทำบ่อย (Template)</h1>
          <p className="text-gray-600 mt-2">
            รายการงานที่ทำบ่อยเพื่อใช้เป็น Template สำหรับสร้างงานใหม่
          </p>
        </div>
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">
            งานที่ทำมากกว่า:
            <select
              value={minFrequency}
              onChange={(e) => setMinFrequency(Number(e.target.value))}
              className="ml-2 px-3 py-1 border rounded-md"
            >
              <option value={3}>3 ครั้ง</option>
              <option value={5}>5 ครั้ง</option>
              <option value={10}>10 ครั้ง</option>
            </select>
          </label>
        </div>
      </div>

      {statistics && (
        <Card>
          <CardHeader>
            <CardTitle>สรุปสถิติ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <div className="text-2xl font-bold text-blue-600">{statistics.total_unique_jobs}</div>
                <div className="text-sm text-gray-600">งานทั้งหมด</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{statistics.jobs_10plus}</div>
                <div className="text-sm text-gray-600">ทำมากกว่า 10 ครั้ง</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">{statistics.jobs_5to9}</div>
                <div className="text-sm text-gray-600">ทำ 5-9 ครั้ง</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">{statistics.jobs_3to4}</div>
                <div className="text-sm text-gray-600">ทำ 3-4 ครั้ง</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{statistics.total_work_plans}</div>
                <div className="text-sm text-gray-600">งานทั้งหมด (รวม)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {jobs.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              ไม่พบงานที่ทำบ่อยตามเงื่อนไขที่กำหนด
            </CardContent>
          </Card>
        ) : (
          jobs.map((job, index) => (
            <Card key={job.job_code} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-lg px-3 py-1">
                        #{index + 1}
                      </Badge>
                      <CardTitle className="text-xl">{job.job_name}</CardTitle>
                    </div>
                    <CardDescription className="mt-2 text-base">
                      รหัส: {job.job_code}
                    </CardDescription>
                  </div>
                  <Badge className="text-lg px-4 py-2">
                    {job.frequency} ครั้ง
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <div>
                      <div className="font-medium">ครั้งแรก</div>
                      <div className="text-gray-600">{formatDate(job.first_date)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <div>
                      <div className="font-medium">ครั้งล่าสุด</div>
                      <div className="text-gray-600">{formatDate(job.last_date)}</div>
                    </div>
                  </div>
                  {job.most_common_time && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="font-medium">เวลาที่ใช้บ่อย</div>
                        <div className="text-gray-600">{job.most_common_time}</div>
                      </div>
                    </div>
                  )}
                  {job.most_common_room && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="font-medium">ห้องผลิต</div>
                        <div className="text-gray-600">{job.most_common_room}</div>
                      </div>
                    </div>
                  )}
                  {job.most_common_machine && (
                    <div className="flex items-center gap-2 text-sm">
                      <Wrench className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="font-medium">เครื่องจักร</div>
                        <div className="text-gray-600">{job.most_common_machine}</div>
                      </div>
                    </div>
                  )}
                </div>

                {job.recentWorkPlans.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-semibold mb-3 text-sm">ตัวอย่างงานล่าสุด:</h4>
                    <div className="space-y-2">
                      {job.recentWorkPlans.map((workPlan) => (
                        <div
                          key={workPlan.id}
                          className="bg-gray-50 p-3 rounded-md text-sm"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <span className="font-medium">
                              {formatDate(workPlan.production_date)}
                            </span>
                            {workPlan.start_time && workPlan.end_time && (
                              <span className="text-gray-600">
                                {workPlan.start_time} - {workPlan.end_time}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {workPlan.room && (
                              <Badge variant="secondary" className="text-xs">
                                <Building2 className="h-3 w-3 mr-1" />
                                {workPlan.room.name}
                              </Badge>
                            )}
                            {workPlan.machine && (
                              <Badge variant="secondary" className="text-xs">
                                <Wrench className="h-3 w-3 mr-1" />
                                {workPlan.machine.name}
                              </Badge>
                            )}
                            {workPlan.operators.length > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                <Users className="h-3 w-3 mr-1" />
                                {workPlan.operators.join(', ')}
                              </Badge>
                            )}
                          </div>
                          {workPlan.notes && (
                            <div className="mt-2 text-gray-600 text-xs">
                              หมายเหตุ: {workPlan.notes.substring(0, 100)}
                              {workPlan.notes.length > 100 ? '...' : ''}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
