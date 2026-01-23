/** @jsxImportSource react */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { PrintWorkPlanSheet, PrintData, PRINT_STYLES } from '@/app/planner/print/PrintWorkPlanShared';

type JobSuggestion = {
  job_code: string;
  job_name: string;
};

const getToday = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// สร้างรายการเวลาตั้งแต่ 08:00 ถึง 17:00 ห่างกัน 15 นาที
const generateTimeOptions = () => {
  const times: string[] = [];
  for (let hour = 8; hour <= 17; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      times.push(timeStr);
    }
  }
  return times;
};

const TIME_OPTIONS = generateTimeOptions();

type User = {
  id: number;
  id_code: string;
  name: string;
  role: string;
};

export default function ManualPrintPage() {
  const [jobQuery, setJobQuery] = useState('');
  const [jobCode, setJobCode] = useState('');
  const [jobName, setJobName] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [productionDate, setProductionDate] = useState(getToday());
  const [order, setOrder] = useState<number | null>(null);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [operators, setOperators] = useState<string[]>(['', '', '', '']); // 4 ตำแหน่ง
  const [users, setUsers] = useState<User[]>([]);
  const [printData, setPrintData] = useState<PrintData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<JobSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    // ดึงรายชื่อ users
    fetch('/api/users')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUsers(data.data || []);
        }
      })
      .catch(err => {
        console.error('Error fetching users:', err);
      });
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-job-search]')) {
        setShowSuggestions(false);
      }
    };

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSuggestions]);

  const handleSearchJobs = async (query: string) => {
    if (!query || !query.trim()) {
      setSuggestions([]);
      return;
    }
    try {
      setIsSearching(true);
      const response = await fetch(`/api/process-steps/search?query=${encodeURIComponent(query.trim())}`);
      const payload = await response.json();
      if (payload.success) {
        setSuggestions(payload.data || []);
        setShowSuggestions(true);
      }
    } catch (err) {
      console.error('Error searching jobs:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSuggestion = (item: JobSuggestion) => {
    setJobQuery(item.job_name || item.job_code || '');
    setJobName(item.job_name || '');
    setJobCode(item.job_code || '');
    setShowSuggestions(false);
  };

  const findJobCodeByName = async (name: string) => {
    if (!name || !name.trim()) return null;
    try {
      const response = await fetch(`/api/process-steps/search?query=${encodeURIComponent(name.trim())}`);
      const payload = await response.json();
      if (payload.success && payload.data && payload.data.length > 0) {
        const exact = payload.data.find(
          (item: JobSuggestion) => item.job_name && item.job_name.trim().toLowerCase() === name.trim().toLowerCase()
        );
        if (exact?.job_code) return exact.job_code.trim();
        return payload.data[0].job_code?.trim() || null;
      }
      return null;
    } catch (error) {
      console.error('Error finding job code by name:', error);
      return null;
    }
  };

  const handleLoadPrintData = async () => {
    try {
      setError(null);
      setIsLoading(true);
      let finalJobCode = jobCode?.trim();

      if (!finalJobCode && jobName) {
        finalJobCode = await findJobCodeByName(jobName);
      }
      if (!finalJobCode && jobQuery) {
        finalJobCode = await findJobCodeByName(jobQuery);
      }

      if (!finalJobCode) {
        setError('กรุณาระบุรหัสงานหรือเลือกชื่องาน');
        setIsLoading(false);
        return;
      }

      const params = new URLSearchParams();
      params.set('jobCode', finalJobCode);
      if (jobName?.trim()) params.set('jobName', jobName.trim());

      const response = await fetch(`/api/work-plans/print-data/by-job?${params.toString()}`);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'ไม่สามารถโหลดข้อมูลงานได้');
      }

      const payload = await response.json();
      if (!payload.success) {
        throw new Error(payload.message || 'ไม่สามารถโหลดข้อมูลงานได้');
      }

      const data: PrintData = payload.data;
      setJobCode(data.jobCode || finalJobCode);
      setJobName(data.jobName || jobName || jobQuery);
      setPrintData(data);
    } catch (err: any) {
      console.error('Error loading print data:', err);
      setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
      setPrintData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const previewData = useMemo(() => {
    if (!printData) return null;
    
    // แปลง operators array เป็น format ที่ PrintData ต้องการ
    const operatorsFull = operators.filter(op => op.trim()).map(op => op.trim());
    const operatorsArray: { name: string }[] = operatorsFull.map(name => ({ name }));
    
    return {
      ...printData,
      productionDate,
      documentNumber: documentNumber || undefined,
      order: order || null,
      planTime: {
        start: startTime || null,
        end: endTime || null,
      },
      operatorsFull: operatorsFull.length > 0 ? operatorsFull : undefined,
      operators: operatorsArray,
    } as PrintData;
  }, [printData, productionDate, documentNumber, order, startTime, endTime, operators]);

  return (
    <div className="manual-print-wrapper">
      <div className="manual-print-card">
        <h1>พิมพ์ใบงานแบบกำหนดเอง</h1>
        <p className="description">
          ค้นหางานด้วยชื่อหรือรหัส กำหนดวันที่ผลิตและเลขที่เอกสาร แล้วเรียกดูใบงานพร้อมสูตรได้ทันที
        </p>

        <div className="form-grid">
          <div className="form-control" data-job-search>
            <label>ค้นหางาน (ชื่อหรือรหัส)</label>
            <div className="relative">
              <input
                type="text"
                value={jobQuery}
                onChange={(e) => {
                  setJobQuery(e.target.value);
                  handleSearchJobs(e.target.value);
                }}
                placeholder="กรอกชื่อหรือรหัสงาน"
              />
              {isSearching && <span className="hint">ค้นหา...</span>}
              {showSuggestions && suggestions.length > 0 && (
                <div className="suggestion-list">
                  {suggestions.map((item, idx) => (
                    <div
                      key={`${item.job_code}-${idx}`}
                      className="suggestion-item"
                      onClick={() => handleSelectSuggestion(item)}
                    >
                      <div className="suggestion-code">{item.job_code}</div>
                      <div className="suggestion-name">{item.job_name}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="form-control">
            <label>รหัสงาน (FG_Code)</label>
            <input
              type="text"
              value={jobCode}
              onChange={(e) => setJobCode(e.target.value)}
              placeholder="กรอกรหัสงาน"
            />
          </div>

          <div className="form-control">
            <label>วันที่ผลิต</label>
            <input
              type="date"
              value={productionDate}
              onChange={(e) => setProductionDate(e.target.value)}
            />
          </div>

          <div className="form-control">
            <label>ลำดับงาน (งานที่)</label>
            <input
              type="number"
              min="1"
              value={order || ''}
              onChange={(e) => {
                const val = e.target.value;
                setOrder(val ? parseInt(val, 10) : null);
              }}
              placeholder="เช่น 1, 2, 3..."
            />
          </div>

          <div className="form-control">
            <label>เลขที่เอกสาร</label>
            <input
              type="text"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
              placeholder="กรอกเลขที่เอกสาร"
            />
          </div>

          <div className="form-control">
            <label>เวลาเริ่ม</label>
            <select
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            >
              <option value="">เลือกเวลาเริ่ม</option>
              {TIME_OPTIONS.map(time => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          </div>

          <div className="form-control">
            <label>เวลาจบ</label>
            <select
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            >
              <option value="">เลือกเวลาจบ</option>
              {TIME_OPTIONS.map(time => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="operators-section">
          <label className="section-label">ผู้ปฏิบัติงาน (1-4 คน)</label>
          <div className="operators-grid">
            {operators.map((op, idx) => (
              <div key={idx} className="form-control">
                <label>ผู้ปฏิบัติงาน {idx + 1}</label>
                <select
                  value={op}
                  onChange={(e) => {
                    const newOps = [...operators];
                    newOps[idx] = e.target.value;
                    setOperators(newOps);
                  }}
                >
                  <option value="">กรุณาเลือก</option>
                  {users.map(user => (
                    <option key={user.id} value={user.name}>
                      {user.name} ({user.id_code})
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        <div className="actions">
          <button onClick={handleLoadPrintData} disabled={isLoading}>
            {isLoading ? 'กำลังโหลด...' : 'โหลดสูตรและใบงาน'}
          </button>
        </div>

        {error && <div className="error-box">{error}</div>}
      </div>

      {previewData ? (
        <div className="preview-area">
          <div className="preview-actions">
            <button onClick={() => window.print()}>พิมพ์ใบงาน</button>
          </div>
          <div className="preview-paper">
            <PrintWorkPlanSheet data={previewData} />
          </div>
        </div>
      ) : (
        <div className="preview-placeholder">
          <p>กรุณาเลือกงานและกด "โหลดสูตรและใบงาน" เพื่อดูตัวอย่าง</p>
        </div>
      )}

      <style jsx>{`
        .manual-print-wrapper {
          min-height: 100vh;
          background: #f3f4f6;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .manual-print-card {
          background: white;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
        }
        h1 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 8px;
        }
        .description {
          color: #475569;
          margin-bottom: 20px;
        }
        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
        }
        .form-control {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        label {
          font-weight: 600;
          color: #1f2937;
        }
        input {
          border: 1px solid #d1d5db;
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 1rem;
        }
        input:focus {
          outline: 2px solid #16a34a;
          border-color: transparent;
        }
        .actions {
          margin-top: 16px;
          display: flex;
          justify-content: flex-end;
        }
        .actions button,
        .preview-actions button {
          background: #16a34a;
          color: white;
          border: none;
          border-radius: 999px;
          padding: 10px 24px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s ease;
        }
        .actions button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .error-box {
          margin-top: 16px;
          padding: 12px;
          border-radius: 10px;
          background: #fee2e2;
          color: #b91c1c;
          font-weight: 500.
        }
        .preview-area {
          background: white;
          border-radius: 16px;
          padding: 16px;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
        }
        .preview-actions {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 12px;
        }
        .preview-paper {
          background: #e2e8f0;
          padding: 16px;
          border-radius: 12px;
          overflow: auto;
        }
        .preview-placeholder {
          border: 2px dashed #cbd5f5;
          border-radius: 16px;
          padding: 40px;
          text-align: center;
          color: #64748b;
          font-weight: 500;
          background: white;
        }
        .relative {
          position: relative;
        }
        .hint {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 0.85rem;
          color: #94a3b8;
        }
        .suggestion-list {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          margin-top: 6px;
          max-height: 300px;
          overflow-y: auto;
          z-index: 20;
          box-shadow: 0 10px 25px rgba(15, 23, 42, 0.15);
        }
        .suggestion-item {
          padding: 10px 14px;
          cursor: pointer;
          border-bottom: 1px solid #f1f5f9;
        }
        .suggestion-item:last-child {
          border-bottom: none;
        }
        .suggestion-item:hover {
          background: #f8fafc;
        }
        .suggestion-code {
          font-weight: 600;
          color: #111827;
        }
        .suggestion-name {
          font-size: 0.9rem;
          color: #6b7280;
        }
        .operators-section {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
        }
        .section-label {
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 12px;
          display: block;
        }
        .operators-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }
        select {
          border: 1px solid #d1d5db;
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 1rem;
          background: white;
        }
        select:focus {
          outline: 2px solid #16a34a;
          border-color: transparent;
        }
      `}</style>

      <style jsx global>{`
        @media print {
          .manual-print-wrapper {
            padding: 0;
            background: white;
          }
          .manual-print-card,
          .actions,
          .description,
          .preview-actions,
          .preview-placeholder {
            display: none !important;
          }
          .preview-paper {
            padding: 0;
            background: transparent;
            box-shadow: none;
          }
        }
      `}</style>

      <style jsx global>{PRINT_STYLES}</style>
    </div>
  );
}

