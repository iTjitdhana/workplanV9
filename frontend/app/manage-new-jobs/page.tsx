'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Edit, Trash2, Plus, RefreshCw, AlertCircle, Search, X, Save } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { formatDateForDisplay } from '@/lib/dateUtils';
import { getApiUrl } from '@/lib/config';

interface NewJob {
  id: number;
  job_code: string;
  job_name: string;
  production_date: string;
}

interface ProcessStep {
  id?: number;
  process_number: number;
  process_description: string;
  worker_count?: number;
}

interface ExistingJob {
  id: number;
  job_code: string;
  job_name: string;
  production_date: string;
}

interface ApiProcessStep {
  process_number: number;
  process_description: string;
  worker_count?: number;
}

export default function ManageNewJobsPage() {
  const [newJobs, setNewJobs] = useState<NewJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingJob, setEditingJob] = useState<NewJob | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [processSteps, setProcessSteps] = useState<ProcessStep[]>([]);
  const [formData, setFormData] = useState({
    new_job_code: '',
    new_job_name: '',
    total_workers: 0
  });
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);
  const [searchType, setSearchType] = useState<'code' | 'name'>('code');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ExistingJob[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchNewJobs();
  }, []);

  const fetchNewJobs = async () => {
    try {
      setLoading(true);
      const response = await fetch(getApiUrl('/api/new-jobs'));
      if (!response.ok) throw new Error('Network error');
      const data = await response.json();
      
      if (data.success) {
        setNewJobs(data.data);
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to fetch new jobs",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch new jobs",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProcessSteps = async (jobCode: string, jobName: string) => {
    try {
      const response = await fetch(getApiUrl(`/api/new-jobs/process-steps?job_code=${encodeURIComponent(jobCode)}&job_name=${encodeURIComponent(jobName)}`));
      if (!response.ok) throw new Error('Network error');
      const data = await response.json();
      
      if (data.success) {
        setProcessSteps(data.data.map((step: ApiProcessStep) => ({
          process_number: step.process_number,
          process_description: step.process_description,
          worker_count: step.worker_count
        })));
      } else {
        setProcessSteps([]);
      }
    } catch (error) {
      console.error('Failed to fetch process steps:', error);
      setProcessSteps([]);
    }
  };

  const openEditDialog = async (job: NewJob) => {
    setEditingJob(job);
    setFormData({
      new_job_code: job.job_code,
      new_job_name: job.job_name,
      total_workers: 0
    });
    await fetchProcessSteps(job.job_code, job.job_name);
    setIsEditDialogOpen(true);
  };

  const handleUpdateJob = async () => {
    if (!editingJob) return;

    try {
      setIsSaving(true);
      // กรอง Process Steps ที่มีข้อมูลครบ
      const validProcessSteps = processSteps.filter(step => 
        step.process_description.trim() && step.process_number > 0
      );

      const response = await fetch(getApiUrl(`/api/new-jobs`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          work_plan_id: editingJob.id,
          new_job_code: formData.new_job_code,
          new_job_name: formData.new_job_name,
          process_steps: validProcessSteps
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Success",
          description: "อัปเดตข้อมูลงานและ Process Steps สำเร็จ",
        });
        setIsEditDialogOpen(false);
        setEditingJob(null);
        setFormData({ new_job_code: '', new_job_name: '', total_workers: 0 });
        setProcessSteps([]);
        fetchNewJobs();
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to update job",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update job",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteJob = async (id: number) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบงานนี้?')) return;

    try {
      const response = await fetch(getApiUrl(`/api/new-jobs/${id}`), {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Success",
          description: "ลบงานสำเร็จ",
        });
        fetchNewJobs();
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to delete job",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete job",
        variant: "destructive"
      });
    }
  };

  const addProcessStep = () => {
    const newStep: ProcessStep = {
      process_number: processSteps.length + 1,
      process_description: '',
      worker_count: undefined
    };
    setProcessSteps([...processSteps, newStep]);
  };

  const removeProcessStep = (index: number) => {
    const updatedSteps = processSteps.filter((_, i) => i !== index);
    // ปรับ process_number ใหม่
    const reorderedSteps = updatedSteps.map((step, i) => ({
      ...step,
      process_number: i + 1
    }));
    setProcessSteps(reorderedSteps);
  };

  const updateProcessStep = (index: number, field: keyof ProcessStep, value: any) => {
    const updatedSteps = [...processSteps];
    updatedSteps[index] = { ...updatedSteps[index], [field]: value };
    setProcessSteps(updatedSteps);
  };

  const formatDate = (dateString: string) => {
    return formatDateForDisplay(dateString, 'short');
  };

  // ค้นหางานที่มีในระบบ
  const searchExistingJobs = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setSearchLoading(true);
      const response = await fetch(getApiUrl(`/api/work-plans/search?${searchType}=${encodeURIComponent(searchQuery.trim())}`));
      if (!response.ok) throw new Error('Network error');
      const data = await response.json();
      
      if (data.success) {
        setSearchResults(data.data);
      } else {
        setSearchResults([]);
        toast({
          title: "ไม่พบข้อมูล",
          description: "ไม่พบงานที่ตรงกับคำค้นหา",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      toast({
        title: "Error",
        description: "เกิดข้อผิดพลาดในการค้นหา",
        variant: "destructive"
      });
    } finally {
      setSearchLoading(false);
    }
  };

  // เลือกงานจากผลการค้นหา
  const selectExistingJob = async (job: ExistingJob) => {
    setFormData({
      new_job_code: job.job_code,
      new_job_name: job.job_name,
      total_workers: 0
    });
    
    await fetchProcessSteps(job.job_code, job.job_name);
    
    setIsSearchDialogOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  // เปิด Dialog ค้นหา
  const openSearchDialog = (type: 'code' | 'name') => {
    setSearchType(type);
    setSearchQuery('');
    setSearchResults([]);
    setIsSearchDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">จัดการงานใหม่</h1>
          <p className="text-muted-foreground">จัดการงานที่มี job_code = "NEW" และกำหนด Process Steps</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchNewJobs} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* รายการงานใหม่ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            รายการงานใหม่ (job_code = "NEW")
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>รหัสงาน</TableHead>
                    <TableHead>ชื่องาน</TableHead>
                    <TableHead>วันที่ผลิต</TableHead>
                    <TableHead>การดำเนินการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {newJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>{job.id}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-orange-100 text-orange-800">
                          {job.job_code}
                        </Badge>
                      </TableCell>
                      <TableCell>{job.job_name}</TableCell>
                      <TableCell>{formatDate(job.production_date)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(job)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            แก้ไข
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteJob(job.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            ลบ
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {newJobs.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  ไม่พบงานที่มี job_code = "NEW"
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
              ข้อมูลขั้นตอนการผลิต
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* ข้อมูลงาน - แถวแรก */}
            <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="new_job_code" className="text-sm font-medium">รหัสสินค้า</Label>
                  <div className="relative">
                    <Input
                      id="new_job_code"
                      value={formData.new_job_code}
                      onChange={(e) => setFormData({...formData, new_job_code: e.target.value})}
                      placeholder="รหัสสินค้า"
                      className="pr-10"
                    />
                                         <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                       <Button
                         type="button"
                         variant="ghost"
                         size="sm"
                         onClick={() => openSearchDialog('code')}
                         className="h-6 w-6 p-0 hover:bg-gray-100"
                       >
                         <Search className="h-4 w-4 text-gray-400" />
                       </Button>
                     </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="new_job_name" className="text-sm font-medium">ชื่อสินค้า</Label>
                  <div className="relative">
                    <Input
                      id="new_job_name"
                      value={formData.new_job_name}
                      onChange={(e) => setFormData({...formData, new_job_name: e.target.value})}
                      placeholder="ชื่อสินค้า"
                      className="pr-10"
                    />
                                         <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                       <Button
                         type="button"
                         variant="ghost"
                         size="sm"
                         onClick={() => openSearchDialog('name')}
                         className="h-6 w-6 p-0 hover:bg-gray-100"
                       >
                         <Search className="h-4 w-4 text-gray-400" />
                       </Button>
                     </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="total_workers" className="text-sm font-medium">จำนวนผู้ปฏิบัติงาน</Label>
                  <Input
                    id="total_workers"
                    type="number"
                    value={formData.total_workers || 0}
                    onChange={(e) => setFormData({...formData, total_workers: parseInt(e.target.value) || 0})}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Process Steps */}
            <div className="border rounded-lg p-4 bg-white">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <Label className="text-lg font-semibold">กระบวนการที่</Label>
              </div>
              
              <div className="space-y-3">
                {processSteps.map((step, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="flex-1">
                      <Input
                        value={step.process_description}
                        onChange={(e) => updateProcessStep(index, 'process_description', e.target.value)}
                        placeholder={`ขั้นตอนที่ ${step.process_number}`}
                        className="w-full"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeProcessStep(index)}
                      className="w-8 h-8 p-0 bg-red-500 hover:bg-red-600 text-white border-red-500"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                <Button onClick={addProcessStep} variant="outline" className="w-full border-dashed border-2 border-purple-300 text-purple-600 hover:bg-purple-50">
                  <Plus className="h-4 w-4 mr-2" />
                  เพิ่มกระบวนการ
                </Button>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleUpdateJob} className="bg-blue-600 hover:bg-blue-700">
                <Save className="h-4 w-4 mr-2" />
                บันทึก
              </Button>
            </div>
          </div>
                 </DialogContent>
       </Dialog>

       {/* Search Dialog */}
       <Dialog open={isSearchDialogOpen} onOpenChange={setIsSearchDialogOpen}>
         <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
           <DialogHeader>
             <DialogTitle className="flex items-center gap-2">
               <Search className="h-5 w-5" />
               ค้นหางานที่มีในระบบ
             </DialogTitle>
           </DialogHeader>
           <div className="space-y-4">
             {/* Search Input */}
             <div className="flex gap-2">
               <div className="flex-1">
                 <Label htmlFor="search_query">ค้นหาโดย{searchType === 'code' ? 'รหัสงาน' : 'ชื่องาน'}</Label>
                 <Input
                   id="search_query"
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   placeholder={`พิมพ์${searchType === 'code' ? 'รหัสงาน' : 'ชื่องาน'}เพื่อค้นหา`}
                   onKeyDown={(e) => e.key === 'Enter' && searchExistingJobs()}
                 />
               </div>
               <div className="flex items-end">
                 <Button onClick={searchExistingJobs} disabled={searchLoading}>
                   {searchLoading ? (
                     <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                   ) : (
                     <Search className="h-4 w-4" />
                   )}
                 </Button>
               </div>
             </div>

             {/* Search Results */}
             {searchResults.length > 0 && (
               <div className="border rounded-lg">
                 <div className="p-3 bg-gray-50 border-b">
                   <h4 className="font-medium">ผลการค้นหา ({searchResults.length} รายการ)</h4>
                 </div>
                 <div className="max-h-60 overflow-y-auto">
                  {searchResults.map((job) => (
                     <div
                      key={job.id}
                       className="p-3 border-b hover:bg-gray-50 cursor-pointer"
                       onClick={() => selectExistingJob(job)}
                     >
                       <div className="flex justify-between items-start">
                         <div className="flex-1">
                           <div className="font-medium text-blue-600">{job.job_code}</div>
                           <div className="text-sm text-gray-600">{job.job_name}</div>
                           <div className="text-xs text-gray-500">
                             วันที่: {formatDate(job.production_date)}
                           </div>
                         </div>
                         <Button variant="outline" size="sm" className="ml-2">
                           เลือก
                         </Button>
                       </div>
                     </div>
                   ))}
                 </div>
               </div>
             )}

             {searchResults.length === 0 && searchQuery && !searchLoading && (
               <div className="text-center py-8 text-muted-foreground">
                 ไม่พบงานที่ตรงกับคำค้นหา
               </div>
             )}
           </div>
         </DialogContent>
       </Dialog>
     </div>
   );
 } 