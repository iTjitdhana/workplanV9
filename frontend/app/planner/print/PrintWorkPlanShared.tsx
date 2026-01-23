import { useMemo } from "react";
import { Sarabun } from "next/font/google";

export type Operator = {
  name: string;
  role?: string;
};

export type Ingredient = {
  rowNumber: number;
  materialCode: string;
  materialName: string;
  quantity: number | null;
  unit: string;
};

export type PrintData = {
  id: number;
  jobCode: string | null;
  jobName: string | null;
  productionDate: string | null;
  order: number | null;
  planTime: {
    start: string | null;
    end: string | null;
  };
  operatorsFull?: string[];
  notes: string;
  documentNumber?: string | null;
  machineName?: string | null;
  roomName?: string | null;
  fgSummary: {
    code: string | null;
    name: string | null;
    unit: string | null;
    size: string | null;
    baseUnit: string | null;
    conversionRate: number | null;
    conversionDescription: string | null;
  };
  operators: Operator[];
  ingredients: Ingredient[];
};

const sarabunFont = Sarabun({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
});

export const sarabunFontClassName = sarabunFont.className;

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatQuantity = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "";
  const num = Number(value);
  if (Number.isNaN(num)) return "";
  return num.toFixed(3);
};

export function PrintWorkPlanSummarySheet({ data, date }: { data: PrintData[]; date: string }) {
  const formattedDate = formatDate(date);

  return (
    <div className="print-page summary-page">
      <header className="summary-header">
        <h1 className="summary-title">ใบสรุปงาน {formattedDate}</h1>
      </header>

      <section className="summary-table-section">
        <table className="summary-table">
          <thead>
            <tr>
              <th className="col-order">งานที่</th>
              <th className="col-item">รายการ</th>
              <th className="col-operator">ผู้ปฏิบัติงาน 1</th>
              <th className="col-operator">ผู้ปฏิบัติงาน 2</th>
              <th className="col-operator">ผู้ปฏิบัติงาน 3</th>
              <th className="col-operator">ผู้ปฏิบัติงาน 4</th>
              <th className="col-time">เริ่มต้น</th>
              <th className="col-time">สิ้นสุด</th>
              <th className="col-machine">เครื่องที่</th>
              <th className="col-room">ห้องผลิต</th>
              <th className="col-completed">ผลิตเสร็จ</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => {
              const operators = item.operatorsFull || [];
              return (
                <tr key={item.id}>
                  <td className="text-center">{item.order ?? "-"}</td>
                  <td>{item.jobName || "-"}</td>
                  <td>{operators[0] || ""}</td>
                  <td>{operators[1] || ""}</td>
                  <td>{operators[2] || ""}</td>
                  <td>{operators[3] || ""}</td>
                  <td className="text-center">{item.planTime?.start || "-"}</td>
                  <td className="text-center">{item.planTime?.end || "-"}</td>
                  <td className="text-center">{item.machineName || "-"}</td>
                  <td className="text-center">{item.roomName || "ไม่ระบุ"}</td>
                  <td className="text-center"></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export function PrintWorkPlanSheet({ data }: { data: PrintData }) {
  const ingredientRows = useMemo(() => {
    const items = data?.ingredients || [];
    const baseCount = items.length;
    const extraRows = baseCount >= 21 ? 0 : Math.min(4, 21 - baseCount);
    const totalRows = Math.min(21, baseCount + extraRows);

    const rows: Ingredient[] = [];

    for (let index = 0; index < totalRows; index++) {
      const item = items[index];
      if (item) {
        rows.push({
          rowNumber: item.rowNumber ?? index + 1,
          materialCode: item.materialCode,
          materialName: item.materialName,
          quantity: item.quantity,
          unit: item.unit,
        });
      } else {
        rows.push({
          rowNumber: index + 1,
          materialCode: "",
          materialName: "",
          quantity: null,
          unit: "",
        });
      }
    }

    return rows;
  }, [data?.ingredients]);

  const {
    order,
    fgSummary,
    productionDate,
    jobCode,
    jobName,
    planTime,
    operatorsFull,
    notes,
  } = data;

  return (
    <div className="print-page">
      <header className="print-header">
        <div className="header-border">
          <div className="header-left">
            <div className="job-title">งานที่</div>
            <div className="job-number">{order ?? "-"}</div>
          </div>
          <div className="header-center">
            <div className="product-code">{fgSummary?.code || jobCode || "-"}</div>
            <div className="product-name">{fgSummary?.name || jobName || "-"}</div>
            {notes && notes.trim() !== "" && (
              <div className="product-note">{notes}</div>
            )}
          </div>
          <div className="header-right">
            <div className="sheet-title">ใบผลิตประจำวัน</div>
            <div className="date-row">
              <span>วันที่ผลิต</span>
              <span>{formatDate(productionDate)}</span>
            </div>
            <div className="doc-row">
              <span>เลขที่เอกสาร</span>
              <span className="doc-box">
                {data.documentNumber?.trim() || "___________________________"}
              </span>
            </div>
          </div>
        </div>
      </header>

      <section className="table-section">
        <table className="ingredients-table">
          <thead>
            <tr>
              <th>ลำดับ</th>
              <th className="text-center">วัถุดิบที่ใช้ผลิต<br /> (รหัสวัตถุดิบ)</th>
              <th>รายการ</th>
              <th>ปริมาณ</th>
              <th>ชั่งน้ำหนัก<br /> (ผู้ตวงสูตร)</th>
              <th>ชั่งน้ำหนักจริง<br /> (ผู้ปฏิบัติงาน)</th>
              <th>หน่วย</th>
            </tr>
          </thead>
          <tbody>
            {ingredientRows.map((row, index) => (
              <tr key={index}>
                <td className="text-center">{row.rowNumber}</td>
                <td className="text-center">{row.materialCode}</td>
                <td>{row.materialName}</td>
                <td className="text-right">
                  {formatQuantity(row.quantity)}
                </td>
                <td></td>
                <td></td>
                <td className="text-center">{row.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="bottom-section">
        <section className="summary-section">
          <div className="summary-line">
            <span className="summary-title">จำนวนที่ต้องผลิตได้</span>
          </div>
          <div className="summary-line">
            <span className="summary-label">ผลิตได้จำนวน</span>
            <span className="summary-field">______________ กก. ,จำนวน ______________ แพ็ค</span>
          </div>
          <div className="summary-line summary-line--emphasis">
            <span className="summary-label">ตามแผนงาน</span>
            <span className="summary-field summary-field--emphasis">
              <span className="summary-field-text">
                เริ่มผลิตเวลา
              </span>
              <span className="summary-time">
                ({planTime?.start || "__:__"}) น.
              </span>
              <span className="summary-field-text">ถึง</span>
              <span className="summary-time">
                ({planTime?.end || "__:__"}) น.
              </span>
            </span>
          </div>
          <div className="summary-line">
            <span className="summary-label">บันทึกเวลา</span>
            <span className="summary-field wide">
              เริ่มผลิตเวลา __________:__________ น. ผลิตเสร็จเวลา __________:__________ น.
            </span>
          </div>
          <div className="summary-line">
            <span className="summary-label">ใช้เวลาผลิตทั้งหมด</span>
            <span className="summary-field">__________:__________ น.</span>
          </div>
          <div className="summary-line mt-4">
            <span className="summary-label">หมายเหตุ</span>
          </div>
          <div className="summary-note">
            <div className="note-line" aria-hidden="true"></div>
            <div className="note-line" aria-hidden="true"></div>
          </div>
        </section>

        <section className="signature-section">
          <div className="signature-line">
            <span>ผู้รับผิดชอบ Premix : _______________ / ผู้ตรวจสอบ Premix : _____________ ( ผู้ผลิต )</span>
          </div>
          <div className="signature-line">
            <span>
              ผู้ปฏิบัติงาน&nbsp;&nbsp;
              {Array.isArray(operatorsFull) && operatorsFull.length > 0
                ? operatorsFull
                    .map((name: string) => `${name} (____________________)`)
                    .join(", ")
                : "____________________ (____________________)"}
            </span>
          </div>
          <div className="signature-line">
            <span>เจ้าหน้าที่คลัง&nbsp;&nbsp;______________________________ จัดเก็บห้อง _______________________</span>
          </div>
          <div className="signature-line">
            <span>ผู้ตรวจสอบ&nbsp;&nbsp;______________________________ ( Head Production )</span>
          </div>
          <div className="signature-line">
            <span>ผู้ตรวจสอบผลิต&nbsp;&nbsp;______________________________ ( Qc Supervisor )</span>
          </div>
        </section>

        <footer className="print-footer">
          <div className="text-xs text-gray-500">
            FM-PN-04 / Rev.0
          </div>
        </footer>
      </div>
    </div>
  );
}

export const PRINT_STYLES = `
  .print-wrapper {
    min-height: 100vh;
    background: #f3f4f6;
    padding: 8px;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    gap: 12px;
  }

  .print-page {
    width: 100%;
    max-width: 194mm;
    min-height: calc(297mm - 20mm);
    background: white;
    padding: 12mm;
    box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
    display: flex;
    flex-direction: column;
    gap: 10px;
    font-size: 11.5px;
    line-height: 1.35;
  }

  .summary-page {
    min-height: calc(297mm - 20mm);
    padding: 10mm;
  }

  .summary-header {
    text-align: center;
    margin-bottom: 16px;
  }

  .summary-header .summary-title {
    font-size: 18px;
    font-weight: 700;
    color: #1f2937;
    margin: 0;
  }

  .summary-table-section {
    flex: 1;
    overflow: visible;
  }

  table.summary-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
    table-layout: fixed;
  }

  table.summary-table th {
    background: #e5f3ef;
    border: 1.5px solid #4b5563;
    padding: 8px 5px;
    text-align: center;
    font-weight: 600;
    vertical-align: middle;
    font-size: 10.5px;
  }

  table.summary-table td {
    border: 1px solid #9ca3af;
    padding: 6px 5px;
    vertical-align: middle;
    word-wrap: break-word;
    font-size: 10.5px;
  }

  table.summary-table .col-order {
    width: 5%;
  }

  table.summary-table .col-item {
    width: 20%;
  }

  table.summary-table .col-operator {
    width: 9%;
  }

  table.summary-table .col-time {
    width: 7%;
  }

  table.summary-table .col-machine {
    width: 8%;
  }

  table.summary-table .col-room {
    width: 10%;
  }

  table.summary-table .col-completed {
    width: 6%;
  }

  table.summary-table tbody tr {
    min-height: 32px;
  }

  table.summary-table tbody tr:nth-child(even) {
    background: #f9fafb;
  }

  .text-center {
    text-align: center;
  }

  .text-right {
    text-align: right;
  }

  .print-header .header-border {
    border: 1px solid #4f81bd;
    border-radius: 12px;
    padding: 10px 14px;
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .header-left {
    width: 110px;
    display: flex;
    flex-direction: column;
    align-items: center;
    border-right: 1px solid #bfdbfe;
    padding-right: 12px;
    gap: 6px;
  }

  .job-title {
    background: #edf2fb;
    border: 1px solid #4f81bd;
    border-radius: 6px;
    padding: 4px 12px;
    font-weight: 600;
    font-size: 12px;
    color: #1d4ed8;
  }

  .job-number {
    background: #e8f5e9;
    border: 1px solid #81c784;
    color: #2e7d32;
    width: 60px;
    height: 60px;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 28px;
    font-weight: 700;
    border-radius: 8px;
  }

  .header-center {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .header-center .product-code {
    font-size: 14px;
    font-weight: 600;
    color: #1d4ed8;
  }

  .header-center .product-name {
    background: #fff4d2;
    border-radius: 4px;
    padding: 6px 12px;
    font-weight: 700;
    font-size: 14px;
  }

  .header-center .product-note {
    color: #c62828;
    font-size: 12.5px;
    font-weight: 600;
  }

  .header-right {
    width: 220px;
    border-left: 1px solid #bfdbfe;
    padding-left: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 12px;
  }

  .header-right .sheet-title {
    text-align: center;
    font-weight: 700;
    font-size: 15px;
  }

  .header-right .date-row,
  .header-right .doc-row {
    display: flex;
    justify-content: space-between;
    gap: 8px;
  }

  .header-right .doc-row span:first-child {
    white-space: nowrap;
  }

  .header-right .doc-box {
    background: #e8f5e9;
    border-radius: 8px;
    padding: 4px 16px;
    border: 1px solid #a5d6a7;
    min-width: 140px;
    display: inline-flex;
    justify-content: center;
    align-items: center;
  }

  .table-section {
    flex: 1;
  }

  table.ingredients-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11.2px;
    table-layout: fixed;
  }

  table.ingredients-table th,
  table.ingredients-table td {
    border: 1px solid #9ca3af;
    padding: 4px 6px;
  }

  table.ingredients-table th {
    background: #e5f3ef;
    text-align: center;
    font-weight: 600;
  }

  table.ingredients-table td {
    min-height: 20px;
  }

  table.ingredients-table th:nth-child(1),
  table.ingredients-table td:nth-child(1) {
    width: 5%;
  }

  table.ingredients-table th:nth-child(2),
  table.ingredients-table td:nth-child(2) {
    width: 15%;
  }

  table.ingredients-table th:nth-child(3),
  table.ingredients-table td:nth-child(3) {
    width: 35%;
  }

  table.ingredients-table th:nth-child(4),
  table.ingredients-table td:nth-child(4) {
    width: 10%;
  }

  table.ingredients-table th:nth-child(5),
  table.ingredients-table td:nth-child(5) {
    width: 12%;
  }

  table.ingredients-table th:nth-child(6),
  table.ingredients-table td:nth-child(6) {
    width: 12%;
  }

  table.ingredients-table th:nth-child(7),
  table.ingredients-table td:nth-child(7) {
    width: 11%;
  }

  .summary-section {
    border: 1px solid #d1d5db;
    padding: 10px 12px;
    border-radius: 10px;
    background: #f9fafb;
    font-size: 11.5px;
  }

  .summary-section .summary-line {
    display: flex;
    gap: 6px;
    margin-bottom: 6px;
    flex-wrap: wrap;
  }

  .summary-section .summary-line--emphasis {
    font-size: 12.5px;
    font-weight: 600;
    border: 1.5px solid #111827;
    border-radius: 10px;
    padding: 8px 12px;
    align-items: center;
    background: transparent;
  }

  .summary-section .summary-title {
    font-weight: 600;
  }

  .summary-section .summary-label {
    min-width: 110px;
    font-weight: 500;
  }

  .summary-section .summary-field {
    flex: 1;
  }

  .summary-section .summary-field--emphasis {
    font-size: 13px;
    font-weight: 600;
    color: #1f2937;
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .summary-section .summary-field--emphasis .summary-field-text {
    letter-spacing: 0.5px;
  }

  .summary-section .summary-field--emphasis .summary-time {
    font-size: 15px;
    font-weight: 700;
    color: #0f172a;
    letter-spacing: 1px;
  }
  }

  .summary-section .summary-note {
    border: 1px solid #d1d5db;
    border-radius: 8px;
    padding: 12px 14px;
    margin-top: 8px;
    font-size: 11px;
    background: white;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .summary-section .summary-note .note-line {
    width: 100%;
    height: 0;
    border-bottom: 1px solid #111827;
    padding-bottom: 12px;
  }

  .bottom-section {
    margin-top: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .signature-section {
    margin-top: 12px;
    font-size: 11.5px;
  }

  .signature-section .signature-line {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 4px;
  }

  .print-footer {
    text-align: right;
    align-self: end;
  }

  .print-dialog-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.35);
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 16px;
    z-index: 50;
  }

  .print-dialog {
    background: #ffffff;
    border-radius: 18px;
    max-width: 780px;
    width: 100%;
    padding: 36px;
    box-shadow: 0 15px 40px rgba(15, 23, 42, 0.15);
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .print-dialog h2 {
    font-size: 1.6875rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0;
  }

  .print-dialog p {
    margin: 0;
    color: #4b5563;
    font-size: 1.425rem;
  }

  .print-dialog-select-actions {
    display: flex;
    align-items: center;
    gap: 18px;
    padding: 12px 18px;
    background: #f3f4f6;
    border-radius: 12px;
    flex-wrap: wrap;
  }

  .select-all-btn,
  .deselect-all-btn {
    padding: 9px 18px;
    border-radius: 9px;
    font-size: 1.3125rem;
    font-weight: 500;
    border: 1px solid #d1d5db;
    background: #ffffff;
    color: #374151;
    cursor: pointer;
    transition: all 0.2s;
  }

  .select-all-btn:hover {
    background: #16a34a;
    color: white;
    border-color: #16a34a;
  }

  .deselect-all-btn:hover {
    background: #ef4444;
    color: white;
    border-color: #ef4444;
  }

  .selected-count {
    margin-left: auto;
    font-size: 1.3125rem;
    font-weight: 600;
    color: #16a34a;
  }

  .print-dialog-list {
    border: 1px solid #e5e7eb;
    border-radius: 15px;
    padding: 18px;
    background: #f9fafb;
    display: flex;
    flex-direction: column;
    gap: 15px;
    max-height: min(630px, 70vh);
    overflow-y: auto;
  }

  .print-dialog-item {
    display: flex;
    flex-direction: column;
    gap: 12px;
    font-size: 1.35rem;
    color: #1f2937;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 15px 18px;
  }

  .print-dialog-item-header {
    display: flex;
    align-items: center;
    gap: 15px;
  }

  .print-dialog-checkbox {
    display: flex;
    align-items: center;
    cursor: pointer;
    flex-shrink: 0;
  }

  .print-dialog-checkbox input[type="checkbox"] {
    width: 27px;
    height: 27px;
    cursor: pointer;
    accent-color: #16a34a;
    margin: 0;
  }

  .print-dialog-item strong {
    font-weight: 600;
    color: #111827;
    flex: 1;
    font-size: 1.35rem;
  }

  .print-dialog-input {
    display: flex;
    flex-direction: column;
    gap: 9px;
  }

  .print-dialog-input label {
    font-size: 1.35rem;
    font-weight: 500;
    color: #374151;
  }

  .print-dialog-input input {
    border: 1px solid #d1d5db;
    border-radius: 12px;
    padding: 12px 18px;
    font-size: 1.425rem;
  }

  .print-dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 18px;
    margin-top: 12px;
  }

  .print-dialog-actions button {
    border-radius: 9999px;
    padding: 12px 27px;
    font-size: 1.35rem;
    font-weight: 500;
    border: none;
    cursor: pointer;
  }

  .print-dialog-actions .cancel-btn {
    background: #e5e7eb;
    color: #374151;
  }

  .print-dialog-actions .confirm-btn {
    background: #16a34a;
    color: white;
  }

  .print-dialog-actions .confirm-btn:disabled {
    background: #9ca3af;
    cursor: not-allowed;
    opacity: 0.6;
  }

  @media (max-width: 640px) {
    .print-dialog {
      max-width: 100%;
    }
  }

  @media print {
    @page {
      size: A4 portrait;
      margin: 8mm 8mm 10mm 8mm;
    }
    :global(body) {
      background: white !important;
      zoom: 0.97;
    }
    .print-wrapper {
      padding: 0;
      background: white;
      gap: 0;
      align-items: stretch;
    }
    .print-page {
      box-shadow: none;
      width: 100%;
      max-width: none;
      min-height: calc(297mm - 20mm);
      padding: 10mm 10mm 12mm 10mm;
      gap: 10px;
      page-break-after: always;
    }
    .summary-page {
      page-break-after: always;
    }
    .print-page:last-child {
      page-break-after: auto;
    }
    .print-footer {
      position: relative;
      bottom: auto;
      right: auto;
    }
    .print-header .header-row,
    .title-row .meta,
    .summary-section,
    .signature-section {
      break-inside: avoid;
    }
    button {
      display: none;
    }
    .print-dialog-overlay {
      display: none !important;
    }
  }
`;


