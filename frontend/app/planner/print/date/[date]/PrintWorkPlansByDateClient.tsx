"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PrintData,
  PrintWorkPlanSheet,
  PRINT_STYLES,
  sarabunFontClassName,
} from "../../PrintWorkPlanShared";

type PrintWorkPlansByDateClientProps = {
  date: string;
};

export default function PrintWorkPlansByDateClient({ date }: PrintWorkPlansByDateClientProps) {
  const router = useRouter();
  const [data, setData] = useState<PrintData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [documentNumbers, setDocumentNumbers] = useState<Record<number, string>>({});
  const [jobCodes, setJobCodes] = useState<Record<number, string>>({});
  const [isUpdatingJobCode, setIsUpdatingJobCode] = useState<Record<number, boolean>>({});
  const [isSearchingJobCode, setIsSearchingJobCode] = useState<Record<number, boolean>>({});
  const [jobCodeSuggestions, setJobCodeSuggestions] = useState<Record<number, Array<{job_code: string, job_name: string}>>>({});
  const [showSuggestions, setShowSuggestions] = useState<Record<number, boolean>>({});
  const [showJobCodeEdit, setShowJobCodeEdit] = useState<Record<number, boolean>>({});
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [shouldPrint, setShouldPrint] = useState(false);

  useEffect(() => {
    if (!date) {
      setError("ไม่พบวันที่สำหรับพิมพ์งาน");
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/work-plans/print-data/by-date?date=${encodeURIComponent(date)}`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload?.message || "ไม่สามารถดึงข้อมูลใบงานทั้งหมดได้");
        }

        const payload = await res.json();
        const items = Array.isArray(payload.data) ? (payload.data as PrintData[]) : [];
        setData(items);
        const initialDocumentNumbers = items.reduce<Record<number, string>>((acc, item) => {
          acc[item.id] = item.documentNumber || "";
          return acc;
        }, {});
        const initialJobCodes = items.reduce<Record<number, string>>((acc, item) => {
          acc[item.id] = item.jobCode || "";
          return acc;
        }, {});
        setDocumentNumbers(initialDocumentNumbers);
        setJobCodes(initialJobCodes);
        // เลือกทั้งหมดโดย default
        setSelectedItems(new Set(items.map((item) => item.id)));
        setShowDialog(items.length > 0);
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
  }, [date]);

  useEffect(() => {
    if (shouldPrint) {
      const timer = setTimeout(() => {
        window.print();
        setShouldPrint(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [shouldPrint]);

  // ปิด suggestions เมื่อคลิกนอก dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-job-code-input]')) {
        setShowSuggestions({});
      }
    };
    
    const hasOpenSuggestions = Object.values(showSuggestions).some(v => v);
    if (hasOpenSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSuggestions]);

  const handleToggleSelect = (itemId: number) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    setSelectedItems(new Set(data.map((item) => item.id)));
  };

  const handleDeselectAll = () => {
    setSelectedItems(new Set());
  };

  // ค้นหา job_code จาก job_name สำหรับงานแต่ละงาน
  const handleSearchJobCode = async (itemId: number, jobName: string) => {
    if (!jobName) return;
    
    setIsSearchingJobCode(prev => ({ ...prev, [itemId]: true }));
    setShowSuggestions(prev => ({ ...prev, [itemId]: false }));
    
    try {
      const res = await fetch(`/api/process-steps/search?query=${encodeURIComponent(jobName)}`);
      const result = await res.json();
      
      if (result.success && result.data && result.data.length > 0) {
        setJobCodeSuggestions(prev => ({ ...prev, [itemId]: result.data }));
        setShowSuggestions(prev => ({ ...prev, [itemId]: true }));
      } else {
        setJobCodeSuggestions(prev => ({ ...prev, [itemId]: [] }));
        setShowSuggestions(prev => ({ ...prev, [itemId]: false }));
      }
    } catch (err) {
      console.error('Error searching job code:', err);
      setJobCodeSuggestions(prev => ({ ...prev, [itemId]: [] }));
      setShowSuggestions(prev => ({ ...prev, [itemId]: false }));
    } finally {
      setIsSearchingJobCode(prev => ({ ...prev, [itemId]: false }));
    }
  };

  // เลือก job_code จาก suggestions
  const handleSelectJobCode = (itemId: number, selectedJobCode: string) => {
    setJobCodes(prev => ({ ...prev, [itemId]: selectedJobCode }));
    setShowSuggestions(prev => ({ ...prev, [itemId]: false }));
    handleUpdateJobCode(itemId, selectedJobCode);
  };

  // อัพเดท job_code และดึงสูตรใหม่
  const handleUpdateJobCode = async (itemId: number, newJobCode?: string) => {
    const currentJobCode = jobCodes[itemId] || "";
    const codeToUpdate = newJobCode || currentJobCode.trim();
    const item = data.find(d => d.id === itemId);
    
    if (!codeToUpdate || codeToUpdate === item?.jobCode) return;
    
    setIsUpdatingJobCode(prev => ({ ...prev, [itemId]: true }));
    
    try {
      // 1. อัพเดท job_code ในฐานข้อมูล
      const updateRes = await fetch(`/api/work-plans/${itemId}`, {
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
      const printRes = await fetch(`/api/work-plans/${itemId}/print-data`);
      if (!printRes.ok) {
        throw new Error('ไม่สามารถดึงข้อมูลใหม่ได้');
      }
      
      const printPayload = await printRes.json();
      const updatedPrintData = printPayload.data as PrintData;
      
      // 3. อัพเดท state
      setData(prev => prev.map(d => d.id === itemId ? updatedPrintData : d));
      setJobCodes(prev => ({ ...prev, [itemId]: updatedPrintData.jobCode || "" }));
      
      console.log(`✅ อัพเดท job_code สำเร็จสำหรับงาน ${itemId}:`, codeToUpdate);
    } catch (err: any) {
      console.error('Error updating job code:', err);
      const errorMessage = err.message || 'เกิดข้อผิดพลาดในการอัพเดทรหัสงาน';
      setError(errorMessage);
      // แสดง alert เพื่อให้ผู้ใช้เห็น error message
      alert(`ไม่สามารถอัพเดทรหัสงานได้: ${errorMessage}`);
    } finally {
      setIsUpdatingJobCode(prev => ({ ...prev, [itemId]: false }));
    }
  };

  const handleConfirm = async () => {
    if (selectedItems.size === 0) {
      alert("กรุณาเลือกงานที่ต้องการพิมพ์อย่างน้อย 1 งาน");
      return;
    }

    // อัพเดท job_code สำหรับงานที่เลือกทั้งหมด
    const updatePromises = Array.from(selectedItems).map(async (itemId) => {
      const currentJobCode = jobCodes[itemId] || "";
      const item = data.find(d => d.id === itemId);
      if (currentJobCode.trim() && currentJobCode.trim() !== item?.jobCode) {
        await handleUpdateJobCode(itemId);
      }
    });
    
    await Promise.all(updatePromises);

    // รอให้อัพเดทเสร็จก่อนดึงข้อมูลใหม่
    const updatedData = await Promise.all(
      Array.from(selectedItems).map(async (itemId) => {
        const res = await fetch(`/api/work-plans/${itemId}/print-data`);
        if (res.ok) {
          const payload = await res.json();
          return payload.data as PrintData;
        }
        return data.find(d => d.id === itemId)!;
      })
    );

    setData(prev => 
      prev.map(item => {
        const updated = updatedData.find(u => u.id === item.id);
        if (updated) {
          return {
            ...updated,
            documentNumber: (documentNumbers[item.id] || "").trim() || undefined,
            jobCode: (jobCodes[item.id] || updated.jobCode || "").trim() || updated.jobCode,
          };
        }
        return {
          ...item,
          documentNumber: (documentNumbers[item.id] || "").trim() || undefined,
        };
      })
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

  if (error && !showDialog) {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center bg-gray-100 space-y-4 ${sarabunFontClassName}`}
      >
        <div className="text-red-600 text-lg font-semibold">{error}</div>
        <div className="flex gap-4">
          <button
            onClick={() => {
              setError(null);
              setShowDialog(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 print:hidden"
          >
            กลับไปหน้า Print Dialog
          </button>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 print:hidden"
          >
            กลับไปหน้าก่อนหน้า
          </button>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center bg-gray-100 space-y-4 ${sarabunFontClassName}`}
      >
        <div className="text-gray-700 text-lg">ไม่มีงานสำหรับวันที่ {date}</div>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 print:hidden"
        >
          กลับไปหน้าก่อนหน้า
        </button>
      </div>
    );
  }

  return (
    <div className={`print-wrapper ${sarabunFontClassName}`}>
      {showDialog && (
        <div className="print-dialog-overlay">
          <div className="print-dialog">
            <h2>ยืนยันการพิมพ์ใบงาน</h2>
            <p>รายการงานประจำวันที่ {date} จำนวน {data.length} งาน:</p>
            <div className="print-dialog-select-actions">
              <button
                type="button"
                className="select-all-btn"
                onClick={handleSelectAll}
              >
                เลือกทั้งหมด
              </button>
              <button
                type="button"
                className="deselect-all-btn"
                onClick={handleDeselectAll}
              >
                ยกเลิกทั้งหมด
              </button>
              <span className="selected-count">
                เลือกแล้ว {selectedItems.size} / {data.length} งาน
              </span>
            </div>
            <div className="print-dialog-list">
              {data.map((item) => (
                <div key={item.id} className="print-dialog-item">
                  <div className="print-dialog-item-header">
                    <label className="print-dialog-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.id)}
                        onChange={() => handleToggleSelect(item.id)}
                      />
                    </label>
                    <strong>
                      งานที่ {item.order ?? "-"} • {item.jobCode || "-"} • {item.jobName || "-"}
                    </strong>
                  </div>
                  <div className="print-dialog-input">
                    {(() => {
                      const currentJobCode = jobCodes[item.id] ?? item.jobCode ?? "";
                      const jobCodeLength = currentJobCode.trim().length;
                      const shouldShowEdit = jobCodeLength < 6 || showJobCodeEdit[item.id];
                      
                      if (jobCodeLength >= 6 && !showJobCodeEdit[item.id]) {
                        // แสดงเฉพาะข้อความแก้ไขรหัสสินค้า (ไม่แสดงรหัส/กรอบ)
                        return (
                          <div style={{ marginBottom: '12px' }}>
                            <span
                              onClick={() => setShowJobCodeEdit(prev => ({ ...prev, [item.id]: true }))}
                              style={{
                                fontSize: '1.125rem',
                                color: '#16a34a',
                                textDecoration: 'underline',
                                cursor: 'pointer',
                                fontWeight: 500
                              }}
                            >
                              แก้ไขรหัสสินค้า
                            </span>
                          </div>
                        );
                      }
                      
                      // แสดง input field (สำหรับรหัส < 6 หลัก หรือกดปุ่มแก้ไขแล้ว)
                      return (
                        <>
                          <div style={{ position: 'relative' }} data-job-code-input={`${item.id}`}>
                            <input
                              id={`job-code-${item.id}`}
                              type="text"
                              value={jobCodes[item.id] ?? item.jobCode ?? ""}
                              onChange={(event) => {
                                setJobCodes(prev => ({ ...prev, [item.id]: event.target.value }));
                                setShowSuggestions(prev => ({ ...prev, [item.id]: false }));
                              }}
                              placeholder="กรอกรหัสงาน"
                              style={{ 
                                width: '100%',
                                paddingRight: '120px'
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleSearchJobCode(item.id, item.jobName || "")}
                              disabled={isSearchingJobCode[item.id] || !item.jobName}
                              style={{
                                position: 'absolute',
                                right: '6px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                padding: '6px 12px',
                                fontSize: '1.125rem',
                                background: '#16a34a',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: isSearchingJobCode[item.id] || !item.jobName ? 'not-allowed' : 'pointer',
                                opacity: isSearchingJobCode[item.id] || !item.jobName ? 0.5 : 1
                              }}
                            >
                              {isSearchingJobCode[item.id] ? 'กำลังค้นหา...' : '🔍 ค้นหา'}
                            </button>
                            {showSuggestions[item.id] && jobCodeSuggestions[item.id] && jobCodeSuggestions[item.id].length > 0 && (
                              <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                background: 'white',
                                border: '1px solid #d1d5db',
                                borderRadius: '12px',
                                marginTop: '6px',
                                maxHeight: '300px',
                                overflowY: 'auto',
                                zIndex: 1000,
                                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                              }}>
                                {jobCodeSuggestions[item.id].map((suggestion, idx) => (
                                  <div
                                    key={idx}
                                    onClick={() => handleSelectJobCode(item.id, suggestion.job_code)}
                                    style={{
                                      padding: '12px 18px',
                                      cursor: 'pointer',
                                      borderBottom: idx < jobCodeSuggestions[item.id].length - 1 ? '1px solid #e5e7eb' : 'none',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                  >
                                    <div style={{ fontWeight: 600, fontSize: '1.35rem' }}>{suggestion.job_code}</div>
                                    <div style={{ fontSize: '1.2rem', color: '#6b7280' }}>{suggestion.job_name}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          {jobCodeLength >= 6 && showJobCodeEdit[item.id] && (
                            <button
                              type="button"
                              onClick={() => setShowJobCodeEdit(prev => ({ ...prev, [item.id]: false }))}
                              style={{
                                marginTop: '8px',
                                padding: '6px 12px',
                                fontSize: '1.05rem',
                                background: '#e5e7eb',
                                color: '#374151',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer'
                              }}
                            >
                              ยกเลิกการแก้ไข
                            </button>
                          )}
                          {jobCodes[item.id] && jobCodes[item.id].trim() && jobCodes[item.id].trim() !== item.jobCode && (
                            <button
                              type="button"
                              onClick={() => handleUpdateJobCode(item.id)}
                              disabled={isUpdatingJobCode[item.id]}
                              style={{
                                marginTop: '12px',
                                padding: '9px 18px',
                                fontSize: '1.3125rem',
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '9px',
                                cursor: isUpdatingJobCode[item.id] ? 'not-allowed' : 'pointer',
                                opacity: isUpdatingJobCode[item.id] ? 0.5 : 1
                              }}
                            >
                              {isUpdatingJobCode[item.id] ? 'กำลังอัพเดท...' : '💾 บันทึกรหัสงาน'}
                            </button>
                          )}
                        </>
                      );
                    })()}
                    {item.ingredients && item.ingredients.length === 0 && (
                      <div style={{ 
                        marginTop: '12px', 
                        padding: '12px', 
                        background: '#fef3c7', 
                        borderRadius: '9px',
                        fontSize: '1.3125rem',
                        color: '#92400e'
                      }}>
                        ⚠️ ไม่พบสูตรสำหรับรหัสงานนี้
                      </div>
                    )}
                  </div>
                  <div className="print-dialog-input">
                    <label htmlFor={`document-number-${item.id}`}>เลขที่เอกสาร</label>
                    <input
                      id={`document-number-${item.id}`}
                      type="text"
                      value={documentNumbers[item.id] ?? ""}
                      onChange={(event) =>
                        setDocumentNumbers((prev) => ({
                          ...prev,
                          [item.id]: event.target.value,
                        }))
                      }
                      placeholder="กรอกเลขที่เอกสาร"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="print-dialog-actions">
              <button
                className="confirm-btn"
                onClick={handleConfirm}
                disabled={selectedItems.size === 0}
              >
                {selectedItems.size === data.length
                  ? "พิมพ์ใบงานทั้งหมด"
                  : `พิมพ์ใบงานที่เลือก (${selectedItems.size} ใบ)`}
              </button>
            </div>
          </div>
        </div>
      )}
      {!showDialog && data.length > 0 && (
        <>
          {data
            .filter((item) => selectedItems.has(item.id))
            .sort((a, b) => {
              // เรียงตาม order เพื่อคงลำดับเลขที่ใบงาน
              const orderA = a.order ?? 0;
              const orderB = b.order ?? 0;
              return orderA - orderB;
            })
            .map((item) => (
              <PrintWorkPlanSheet key={item.id} data={item} />
            ))}
        </>
      )}
      <style jsx>{PRINT_STYLES}</style>
    </div>
  );
}


