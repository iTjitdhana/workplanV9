"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Save, X } from 'lucide-react'
import { getApiUrl } from '@/lib/config'

interface MaterialData {
  id: number
  FG_Code: string
  Raw_Code: string
  Raw_Qty: number
  Raw_Unit: string
  Mat_Name: string
  Mat_Unit: string
  price: string
  actualQty: string
  isMain: boolean
}

interface ProductionCostModalProps {
  isOpen: boolean
  onClose: () => void
  workPlan: any
  selectedDate: string
  onSave: () => void
}

export default function ProductionCostModal({
  isOpen,
  onClose,
  workPlan,
  selectedDate,
  onSave
}: ProductionCostModalProps) {
  const [materials, setMaterials] = useState<MaterialData[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [outputQty, setOutputQty] = useState('')
  const [timeUsedMinutes, setTimeUsedMinutes] = useState('')
  const [operatorsCount, setOperatorsCount] = useState('')
  const [notes, setNotes] = useState('')

  // ดึงข้อมูล BOM เมื่อเปิด Modal
  useEffect(() => {
    if (isOpen && workPlan?.job_code) {
      fetchBOMData()
    }
  }, [isOpen, workPlan])

    const fetchBOMData = async () => {
    try {
      setLoading(true)
      
      // ดึงข้อมูล BOM
      const bomResponse = await fetch(getApiUrl(`/api/logs/bom?fgCode=${workPlan.job_code}`))
      const bomResult = await bomResponse.json()
      
      if (bomResult.success) {
        // ดึงข้อมูลต้นทุนการผลิตที่มีอยู่แล้ว
        const costResponse = await fetch(getApiUrl(`/api/logs/production-costs?workPlanId=${workPlan.id}&productionDate=${selectedDate}`))
        const costResult = await costResponse.json()
        
        let materialData = bomResult.data.map((item: any) => ({
          ...item,
          actualQty: '0.000', // เริ่มต้นด้วย 0.000
          price: item.price ? item.price.toString() : '0.00', // แปลงราคาเป็น string
          isMain: false // เริ่มต้นไม่ติ๊กเป็นวัตถุดิบหลัก
        }))
        
        // ถ้ามีข้อมูลต้นทุนการผลิตอยู่แล้ว ให้ใช้ข้อมูลนั้น
        if (costResult.success && costResult.data && costResult.data.material_details) {
          try {
            const savedMaterialDetails = JSON.parse(costResult.data.material_details)
            
            // อัปเดตข้อมูลจากที่บันทึกไว้
            materialData = materialData.map((item: any) => {
              const savedItem = savedMaterialDetails.find((saved: any) => saved.Raw_Code === item.Raw_Code)
              if (savedItem) {
                return {
                  ...item,
                  actualQty: savedItem.actualQty ? savedItem.actualQty.toString() : '0.000',
                  price: savedItem.price ? savedItem.price.toString() : '0.00',
                  isMain: savedItem.isMain || false
                }
              }
              return item
            })
          } catch (error) {
            console.error('Error parsing material_details:', error)
          }
        }
        
        setMaterials(materialData)
      }
    } catch (error) {
      console.error('Error fetching BOM data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMaterialChange = (index: number, field: string, value: any) => {
    const updatedMaterials = [...materials]
    updatedMaterials[index] = {
      ...updatedMaterials[index],
      [field]: value
    }
    setMaterials(updatedMaterials)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      
      const response = await fetch(getApiUrl('/api/logs/production-costs'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
                 body: JSON.stringify({
           workPlanId: workPlan.id,
           jobCode: workPlan.job_code,
           jobName: workPlan.job_name,
           productionDate: selectedDate,
           materialData: materials.map(m => ({
             ...m,
             actualQty: parseFloat(m.actualQty) || 0, // แปลงเป็นตัวเลขสำหรับการคำนวณ
             price: parseFloat(m.price) || 0 // แปลงเป็นตัวเลขสำหรับการคำนวณ
           })),
           outputQty: parseFloat(outputQty) || 0,
           timeUsedMinutes: parseInt(timeUsedMinutes) || 0,
           operatorsCount: parseInt(operatorsCount) || 0,
           notes
         })
      })

      const result = await response.json()
      
      if (result.success) {
        onSave()
        onClose()
        // Reset form
        setMaterials([])
        setOutputQty('')
        setTimeUsedMinutes('')
        setOperatorsCount('')
        setNotes('')
      }
    } catch (error) {
      console.error('Error saving production cost data:', error)
    } finally {
      setSaving(false)
    }
  }

  const calculateTotalCost = () => {
    return materials.reduce((sum, material) => {
      const qty = parseFloat(material.actualQty) || 0
      const price = parseFloat(material.price) || 0
      return sum + (qty * price)
    }, 0)
  }

  const calculateMainMaterialCost = () => {
    return materials
      .filter(material => material.isMain)
      .reduce((sum, material) => {
        const qty = parseFloat(material.actualQty) || 0
        const price = parseFloat(material.price) || 0
        return sum + (qty * price)
      }, 0)
  }

  // ฟังก์ชันสำหรับจัดรูปแบบตัวเลขให้เป็นทศนิยม 3 ตำแหน่ง
  const formatNumber = (value: string | number) => {
    const num = parseFloat(value.toString()) || 0
    return num.toFixed(3)
  }

  // ฟังก์ชันสำหรับจัดการการกดปุ่มลูกศรและ Enter
  const handleKeyDown = (e: React.KeyboardEvent, index: number, field: string, currentValue: string) => {
    const value = parseFloat(currentValue) || 0
    const step = field === 'price' ? 0.01 : 0.001

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const newValue = value + step
      handleMaterialChange(index, field, newValue.toFixed(field === 'price' ? 2 : 3))
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const newValue = Math.max(0, value - step)
      handleMaterialChange(index, field, newValue.toFixed(field === 'price' ? 2 : 3))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      // หาช่องถัดไป
      const inputs = document.querySelectorAll('input[type="number"]')
      const currentInput = e.target as HTMLInputElement
      const currentIndex = Array.from(inputs).indexOf(currentInput)
      const nextInput = inputs[currentIndex + 1] as HTMLInputElement
      if (nextInput) {
        nextInput.focus()
        nextInput.select()
      }
    }
  }

  // ฟังก์ชันสำหรับจัดการการคลิกที่ช่อง input
  const handleInputClick = (e: React.MouseEvent<HTMLInputElement>) => {
    const input = e.target as HTMLInputElement
    input.select() // เลือกข้อความทั้งหมด
  }

  // ฟังก์ชันสำหรับจัดการการ focus ที่ช่อง input
  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    const input = e.target as HTMLInputElement
    input.select() // เลือกข้อความทั้งหมดเมื่อ focus
  }

  const getDisplayUnit = () => {
    const allUnitsKg = materials.every(material => material.Mat_Unit === 'กก.')
    return allUnitsKg ? 'กก.' : 'หน่วย'
  }

  return (
         <Dialog open={isOpen} onOpenChange={onClose}>
       <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            กรอกข้อมูลต้นทุนการผลิต
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          </DialogTitle>
          <DialogDescription>
            งาน: {workPlan?.job_name} ({workPlan?.job_code}) - วันที่ {selectedDate}
          </DialogDescription>
        </DialogHeader>

                 <div className="space-y-6">
           {/* ข้อมูลการผลิต - ซ่อนไว้ */}
           <div className="hidden">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div>
                 <Label htmlFor="outputQty">จำนวนที่ผลิตได้</Label>
                 <Input
                   id="outputQty"
                   type="number"
                   step="0.01"
                   value={outputQty}
                   onChange={(e) => setOutputQty(e.target.value)}
                   placeholder="0.00"
                 />
               </div>
               <div>
                 <Label htmlFor="timeUsed">เวลาที่ใช้ (นาที)</Label>
                 <Input
                   id="timeUsed"
                   type="number"
                   value={timeUsedMinutes}
                   onChange={(e) => setTimeUsedMinutes(e.target.value)}
                   placeholder="0"
                 />
               </div>
               <div>
                 <Label htmlFor="operators">จำนวนผู้ปฏิบัติงาน</Label>
                 <Input
                   id="operators"
                   type="number"
                   value={operatorsCount}
                   onChange={(e) => setOperatorsCount(e.target.value)}
                   placeholder="0"
                 />
               </div>
             </div>
           </div>

                     {/* ตารางวัตถุดิบ */}
           <div className="rounded-md border">
             <Table>
               <TableHeader>
                 <TableRow className="bg-blue-50">
                   <TableHead className="w-[60px] text-center">ลำดับ</TableHead>
                   <TableHead className="w-[80px] text-center">วัตถุดิบหลัก</TableHead>
                   <TableHead className="w-[140px]">วัตถุดิบที่ใช้ผลิต</TableHead>
                   <TableHead>รายการ</TableHead>
                   <TableHead className="w-[100px] text-center">ปริมาณ</TableHead>
                   <TableHead className="w-[150px] text-center">ชั่งน้ำหนัก (ผู้ตวงสูตร)</TableHead>

                   <TableHead className="w-[120px] text-center">ราคาวัตถุดิบ</TableHead>
                   <TableHead className="w-[80px] text-center">หน่วย</TableHead>
                 </TableRow>
               </TableHeader>
              <TableBody>
                                 {loading ? (
                   <TableRow>
                     <TableCell colSpan={8} className="text-center py-8">
                       <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                       กำลังโหลดข้อมูล...
                     </TableCell>
                   </TableRow>
                 ) : materials.length === 0 ? (
                   <TableRow>
                     <TableCell colSpan={8} className="text-center py-8">
                       ไม่พบข้อมูลสูตรการผลิต
                     </TableCell>
                   </TableRow>
                 ) : (
                   materials.map((material, index) => (
                     <TableRow key={material.id}>
                                            <TableCell className="text-center font-medium">
                       {index + 1}
                     </TableCell>
                     <TableCell className="text-center">
                       <Checkbox
                         checked={material.isMain}
                         onCheckedChange={(checked) => 
                           handleMaterialChange(index, 'isMain', checked)
                         }
                       />
                     </TableCell>
                     <TableCell className="font-mono text-sm">
                       {material.Raw_Code}
                     </TableCell>
                       <TableCell>{material.Mat_Name}</TableCell>
                       <TableCell className="text-center">
                         {formatNumber(material.Raw_Qty)}
                       </TableCell>
                       <TableCell>
                         <Input
                           type="number"
                           step="0.001"
                           min="0"
                           value={material.actualQty}
                           onChange={(e) => 
                             handleMaterialChange(index, 'actualQty', e.target.value)
                           }
                           onKeyDown={(e) => handleKeyDown(e, index, 'actualQty', material.actualQty)}
                           onClick={handleInputClick}
                           onFocus={handleInputFocus}
                           onBlur={(e) => {
                             // จัดรูปแบบทศนิยม 3 ตำแหน่งเมื่อออกจากช่อง
                             const value = parseFloat(e.target.value) || 0
                             handleMaterialChange(index, 'actualQty', value.toFixed(3))
                           }}
                           className="w-full text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                           placeholder="0.000"
                         />
                       </TableCell>

                       <TableCell>
                         <Input
                           type="number"
                           step="0.01"
                           min="0"
                           value={material.price}
                           onChange={(e) => 
                             handleMaterialChange(index, 'price', e.target.value)
                           }
                           onKeyDown={(e) => handleKeyDown(e, index, 'price', material.price)}
                           onClick={handleInputClick}
                           onFocus={handleInputFocus}
                           onBlur={(e) => {
                             // จัดรูปแบบทศนิยม 2 ตำแหน่งเมื่อออกจากช่อง
                             const value = parseFloat(e.target.value) || 0
                             handleMaterialChange(index, 'price', value.toFixed(2))
                           }}
                           className="w-full text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                           placeholder="0.00"
                         />
                       </TableCell>
                       <TableCell className="text-center">
                         {material.Mat_Unit}
                       </TableCell>
                     </TableRow>
                   ))
                 )}
              </TableBody>
            </Table>
          </div>

                     {/* สรุปต้นทุน - ซ่อนไว้ */}
           <div className="hidden">
             <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
               <div>
                 <Label className="text-sm text-gray-600">ต้นทุนวัตถุดิบหลัก</Label>
                 <div className="text-lg font-bold text-blue-600">
                   {calculateMainMaterialCost().toFixed(2)} บาท
                 </div>
               </div>
               <div>
                 <Label className="text-sm text-gray-600">ต้นทุนวัตถุดิบรวม</Label>
                 <div className="text-lg font-bold text-green-600">
                   {calculateTotalCost().toFixed(2)} บาท
                 </div>
               </div>
               <div>
                 <Label className="text-sm text-gray-600">ราคาต่อหน่วย</Label>
                 <div className="text-lg font-bold text-purple-600">
                   {outputQty && parseFloat(outputQty) > 0 
                     ? (calculateTotalCost() / parseFloat(outputQty)).toFixed(2) 
                     : '0.00'} บาท
                 </div>
               </div>
               <div>
                 <Label className="text-sm text-gray-600">หน่วย</Label>
                 <div className="text-lg font-bold text-gray-800">
                   {getDisplayUnit()}
                 </div>
               </div>
             </div>
           </div>

           {/* หมายเหตุ - ซ่อนไว้ */}
           <div className="hidden">
             <Label htmlFor="notes">หมายเหตุ</Label>
             <Input
               id="notes"
               value={notes}
               onChange={(e) => setNotes(e.target.value)}
               placeholder="หมายเหตุเพิ่มเติม..."
             />
           </div>
        </div>

                 <DialogFooter>
           <Button variant="outline" onClick={onClose} disabled={saving}>
             <X className="h-4 w-4 mr-2" />
             ยกเลิก
           </Button>
           <Button onClick={handleSave} disabled={saving || materials.length === 0}>
             {saving ? (
               <Loader2 className="h-4 w-4 mr-2 animate-spin" />
             ) : (
               <Save className="h-4 w-4 mr-2" />
             )}
             บันทึกข้อมูลวัตถุดิบ
           </Button>
         </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
