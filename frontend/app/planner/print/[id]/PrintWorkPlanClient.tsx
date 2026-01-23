"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PrintData,
  PrintWorkPlanSheet,
  PRINT_STYLES,
  sarabunFontClassName,
} from "../PrintWorkPlanShared";

type PrintWorkPlanClientProps = {
  workPlanId: string;
};

export default function PrintWorkPlanClient({ workPlanId }: PrintWorkPlanClientProps) {
  const router = useRouter();
  const [data, setData] = useState<PrintData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [documentNumber, setDocumentNumber] = useState("");
  const [jobCode, setJobCode] = useState("");
  const [isUpdatingJobCode, setIsUpdatingJobCode] = useState(false);
  const [isSearchingJobCode, setIsSearchingJobCode] = useState(false);
  const [jobCodeSuggestions, setJobCodeSuggestions] = useState<Array<{job_code: string, job_name: string}>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [shouldPrint, setShouldPrint] = useState(false);

  useEffect(() => {
    if (!workPlanId) {
      setError("ไม่พบรหัสงานสำหรับพิมพ์");
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/work-plans/${workPlanId}/print-data`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload?.message || "ไม่สามารถดึงข้อมูลใบงานได้");
        }

        const payload = await res.json();
        const printData = payload.data as PrintData;
        setData(printData);
        setDocumentNumber(printData.documentNumber || "");
        setJobCode(printData.jobCode || "");
        setShowDialog(true);
        setShouldPrint(false);
        setError(null);
      } catch (err: any) {
        if (err.name === "AbortError") return;
        setError(err.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล");
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => controller.abort();
  }, [workPlanId]);

  useEffect(() => {
    if (shouldPrint) {
      const timer = setTimeout(() => {
        window.print();
        setShouldPrint(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [shouldPrint]);

  // ปิด suggestions เมื่อคลิกนอก dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showSuggestions && !target.closest('[data-job-code-input]')) {
        setShowSuggestions(false);
      }
    };
    
    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSuggestions]);

  // ค้นหา job_code จาก job_name
  const handleSearchJobCode = async () => {
    if (!data?.jobName) return;
    
    setIsSearchingJobCode(true);
    setShowSuggestions(false);
    
    try {
      const res = await fetch(`/api/process-steps/search?query=${encodeURIComponent(data.jobName)}`);
      const result = await res.json();
      
      if (result.success && result.data && result.data.length > 0) {
        setJobCodeSuggestions(result.data);
        setShowSuggestions(true);
      } else {
        setJobCodeSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (err) {
      console.error('Error searching job code:', err);
      setJobCodeSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsSearchingJobCode(false);
    }
  };

  // เลือก job_code จาก suggestions
  const handleSelectJobCode = (selectedJobCode: string) => {
    setJobCode(selectedJobCode);
    setShowSuggestions(false);
    handleUpdateJobCode(selectedJobCode);
  };

  // อัพเดท job_code และดึงสูตรใหม่
  const handleUpdateJobCode = async (newJobCode?: string) => {
    const codeToUpdate = newJobCode || jobCode.trim();
    if (!codeToUpdate || codeToUpdate === data?.jobCode) return;
    
    setIsUpdatingJobCode(true);
    
    try {
      // 1. อัพเดท job_code ในฐานข้อมูล
      const updateRes = await fetch(`/api/work-plans/${workPlanId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_code: codeToUpdate })
      });
      
      if (!updateRes.ok) {
        const errorData = await updateRes.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.errors?.[0]?.msg || 'ไม่สามารถอัพเดทรหัสงานได้';
        throw new Error(errorMessage);
      }
      
      // 2. ดึงข้อมูลพิมพ์ใหม่เพื่อให้ได้สูตรที่ถูกต้อง
      const printRes = await fetch(`/api/work-plans/${workPlanId}/print-data`);
      if (!printRes.ok) {
        throw new Error('ไม่สามารถดึงข้อมูลใหม่ได้');
      }
      
      const printPayload = await printRes.json();
      const updatedPrintData = printPayload.data as PrintData;
      
      // 3. อัพเดท state
      setData(updatedPrintData);
      setJobCode(updatedPrintData.jobCode || "");
      
      console.log('✅ อัพเดท job_code สำเร็จ:', codeToUpdate);
    } catch (err: any) {
      console.error('Error updating job code:', err);
      const errorMessage = err.message || 'เกิดข้อผิดพลาดในการอัพเดทรหัสงาน';
      setError(errorMessage);
      // แสดง alert เพื่อให้ผู้ใช้เห็น error message
      alert(`ไม่สามารถอัพเดทรหัสงานได้: ${errorMessage}`);
    } finally {
      setIsUpdatingJobCode(false);
    }
  };

  const handleConfirm = async () => {
    // อัพเดท job_code ถ้ามีการแก้ไข
    if (jobCode.trim() && jobCode.trim() !== data?.jobCode) {
      await handleUpdateJobCode();
    }
    
    setData((prev) =>
      prev
        ? {
            ...prev,
            documentNumber: documentNumber.trim() || undefined,
            jobCode: jobCode.trim() || prev.jobCode,
          }
        : prev
    );
    setShowDialog(false);
    setShouldPrint(true);
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center bg-gray-100 ${sarabunFontClassName}`}>
        <div className="text-gray-600 text-lg">กำลังโหลดข้อมูลสำหรับพิมพ์...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center bg-gray-100 space-y-4 ${sarabunFontClassName}`}
      >
        <div className="text-red-600 text-lg">{error}</div>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 print:hidden"
        >
          กลับไปหน้าก่อนหน้า
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className={`print-wrapper ${sarabunFontClassName}`}>
      {showDialog && (
        <div className="print-dialog-overlay">
          <div className="print-dialog">
            <h2>ยืนยันการพิมพ์ใบงาน</h2>
            <p>ตรวจสอบข้อมูลก่อนพิมพ์:</p>
            <div className="print-dialog-list">
              <div className="print-dialog-item">
                <strong>งานที่ {data.order ?? "-"}</strong>
                <span>{data.jobCode || "-"}</span>
                <span>{data.jobName || "-"}</span>
                <span>วันที่ผลิต: {data.productionDate || "-"}</span>
              </div>
            </div>
            <div className="print-dialog-input">
              <label htmlFor="job-code">รหัสงาน (FG_Code)</label>
              <div style={{ position: 'relative' }} data-job-code-input>
                <input
                  id="job-code"
                  type="text"
                  value={jobCode}
                  onChange={(event) => {
                    setJobCode(event.target.value);
                    setShowSuggestions(false);
                  }}
                  placeholder="กรอกรหัสงาน"
                  style={{ 
                    width: '100%',
                    paddingRight: '80px'
                  }}
                />
                <button
                  type="button"
                  onClick={handleSearchJobCode}
                  disabled={isSearchingJobCode || !data?.jobName}
                  style={{
                    position: 'absolute',
                    right: '4px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    padding: '4px 8px',
                    fontSize: '0.75rem',
                    background: '#16a34a',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: isSearchingJobCode || !data?.jobName ? 'not-allowed' : 'pointer',
                    opacity: isSearchingJobCode || !data?.jobName ? 0.5 : 1
                  }}
                >
                  {isSearchingJobCode ? 'กำลังค้นหา...' : '🔍 ค้นหา'}
                </button>
                {showSuggestions && jobCodeSuggestions.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'white',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    marginTop: '4px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 1000,
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}>
                    {jobCodeSuggestions.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSelectJobCode(item.job_code)}
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          borderBottom: idx < jobCodeSuggestions.length - 1 ? '1px solid #e5e7eb' : 'none',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
                      >
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.job_code}</div>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{item.job_name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {jobCode.trim() && jobCode.trim() !== data?.jobCode && (
                <button
                  type="button"
                  onClick={() => handleUpdateJobCode()}
                  disabled={isUpdatingJobCode}
                  style={{
                    marginTop: '8px',
                    padding: '6px 12px',
                    fontSize: '0.875rem',
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: isUpdatingJobCode ? 'not-allowed' : 'pointer',
                    opacity: isUpdatingJobCode ? 0.5 : 1
                  }}
                >
                  {isUpdatingJobCode ? 'กำลังอัพเดท...' : '💾 บันทึกรหัสงาน'}
                </button>
              )}
              {data?.ingredients && data.ingredients.length === 0 && (
                <div style={{ 
                  marginTop: '8px', 
                  padding: '8px', 
                  background: '#fef3c7', 
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  color: '#92400e'
                }}>
                  ⚠️ ไม่พบสูตรสำหรับรหัสงานนี้
                </div>
              )}
            </div>
            <div className="print-dialog-input">
              <label htmlFor="document-number">เลขที่เอกสาร</label>
              <input
                id="document-number"
                type="text"
                value={documentNumber}
                onChange={(event) => setDocumentNumber(event.target.value)}
                placeholder="กรอกเลขที่เอกสาร"
              />
            </div>
            <div className="print-dialog-actions">
              <button className="cancel-btn" onClick={() => router.back()}>
                ยกเลิก
              </button>
              <button className="confirm-btn" onClick={handleConfirm}>
                พิมพ์ใบงาน
              </button>
            </div>
          </div>
        </div>
      )}
      <PrintWorkPlanSheet data={data} />
      <style jsx>{PRINT_STYLES}</style>
    </div>
  );
}


