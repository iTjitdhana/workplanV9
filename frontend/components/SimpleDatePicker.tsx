import React, { useState, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { formatThaiDate } from '@/lib/thaiDate';

interface SimpleDatePickerProps {
  value: string; // YYYY-MM-DD format
  onChange: (date: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const SimpleDatePicker: React.FC<SimpleDatePickerProps> = ({
  value,
  onChange,
  placeholder = "เลือกวันที่",
  disabled = false,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // แปลง string เป็น Date object
  const selectedDate = value ? new Date(value + 'T00:00:00') : null;

  // แสดงวันที่แบบไทย (พ.ศ.)
  const displayDate = selectedDate 
    ? formatThaiDate(selectedDate)
    : placeholder;

  // สร้างปฏิทินแบบง่าย
  const generateCalendar = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const weeks = [];
    let week = [];

    // เพิ่มวันว่างในสัปดาห์แรก
    for (let i = 0; i < startingDayOfWeek; i++) {
      week.push(null);
    }

    // เพิ่มวันที่ในเดือน
    for (let day = 1; day <= daysInMonth; day++) {
      week.push(day);
      
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    }

    // เพิ่มสัปดาห์สุดท้าย (ถ้ามี)
    if (week.length > 0) {
      while (week.length < 7) {
        week.push(null);
      }
      weeks.push(week);
    }

    return weeks;
  };

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  
  // Initialize จาก value ถ้ามี มิฉะนั้นใช้เดือนปัจจุบัน
  const initialYear = selectedDate ? selectedDate.getFullYear() : currentYear;
  const initialMonth = selectedDate ? selectedDate.getMonth() : currentMonth;
  
  const [viewYear, setViewYear] = useState(initialYear);
  const [viewMonth, setViewMonth] = useState(initialMonth);
  
  // Update calendar view เมื่อ popup เปิดครั้งแรก
  useEffect(() => {
    if (isOpen && value) {
      const date = new Date(value + 'T00:00:00');
      setViewYear(date.getFullYear());
      setViewMonth(date.getMonth());
    }
  }, [isOpen, value]);

  const weeks = generateCalendar(viewYear, viewMonth);
  const monthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const dayNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

  const handleDateClick = (day: number) => {
    // แก้ไข timezone issue
    const year = viewYear;
    const month = String(viewMonth + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const formattedDate = `${year}-${month}-${dayStr}`;
    onChange(formattedDate);
    setIsOpen(false);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'next') {
      if (viewMonth === 11) {
        setViewMonth(0);
        setViewYear(viewYear + 1);
      } else {
        setViewMonth(viewMonth + 1);
      }
    } else {
      if (viewMonth === 0) {
        setViewMonth(11);
        setViewYear(viewYear - 1);
      } else {
        setViewMonth(viewMonth - 1);
      }
    }
  };

  const isToday = (day: number) => {
    return viewYear === today.getFullYear() && 
           viewMonth === today.getMonth() && 
           day === today.getDate();
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return viewYear === selectedDate.getFullYear() && 
           viewMonth === selectedDate.getMonth() && 
           day === selectedDate.getDate();
  };

  return (
    <div className={className}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-between text-left font-normal h-10 px-3 py-2",
              "border-gray-300 hover:border-green-400 hover:bg-green-50",
              !selectedDate && "text-gray-500"
            )}
            disabled={disabled}
          >
            <div className="flex items-center">
              <Calendar className="mr-2 h-4 w-4 text-green-600" />
              {displayDate}
            </div>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0 shadow-lg border" align="start">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-green-50">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('prev')}
              className="h-8 w-8 p-0 hover:bg-green-100 text-green-700"
            >
              <ChevronDown className="h-4 w-4 rotate-90" />
            </Button>
            
            <h3 className="text-base font-semibold text-green-900">
              {monthNames[viewMonth]} {viewYear + 543}
            </h3>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('next')}
              className="h-8 w-8 p-0 hover:bg-green-100 text-green-700"
            >
              <ChevronDown className="h-4 w-4 -rotate-90" />
            </Button>
          </div>

          {/* Calendar */}
          <div className="p-4">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayNames.map((day) => (
                <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="space-y-1">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="grid grid-cols-7 gap-1">
                  {week.map((day, dayIndex) => (
                    <button
                      key={dayIndex}
                      onClick={() => day && handleDateClick(day)}
                      disabled={!day}
                      className={cn(
                        "h-9 w-9 text-sm font-medium rounded-lg transition-all duration-200",
                        "hover:bg-green-50 hover:text-green-600 focus:outline-none focus:ring-2 focus:ring-green-500",
                        !day && "cursor-default",
                        day && isSelected(day) && "bg-green-600 text-white hover:bg-green-700 shadow-md",
                        day && isToday(day) && !isSelected(day) && "bg-green-100 text-green-900 font-semibold",
                        day && !isSelected(day) && !isToday(day) && "text-gray-700"
                      )}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="border-t bg-gray-50 p-3">
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date();
                  const year = today.getFullYear();
                  const month = String(today.getMonth() + 1).padStart(2, '0');
                  const day = String(today.getDate()).padStart(2, '0');
                  const formattedDate = `${year}-${month}-${day}`;
                  onChange(formattedDate);
                  setViewYear(year);
                  setViewMonth(today.getMonth());
                  setIsOpen(false);
                }}
                className="text-xs py-2 hover:bg-green-50 hover:text-green-700 hover:border-green-300"
              >
                วันนี้
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  const year = tomorrow.getFullYear();
                  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
                  const day = String(tomorrow.getDate()).padStart(2, '0');
                  const formattedDate = `${year}-${month}-${day}`;
                  onChange(formattedDate);
                  setIsOpen(false);
                }}
                className="text-xs py-2 hover:bg-green-50 hover:text-green-700 hover:border-green-300"
              >
                พรุ่งนี้
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const nextWeek = new Date();
                  nextWeek.setDate(nextWeek.getDate() + 7);
                  const year = nextWeek.getFullYear();
                  const month = String(nextWeek.getMonth() + 1).padStart(2, '0');
                  const day = String(nextWeek.getDate()).padStart(2, '0');
                  const formattedDate = `${year}-${month}-${day}`;
                  onChange(formattedDate);
                  setIsOpen(false);
                }}
                className="text-xs py-2 hover:bg-green-50 hover:text-green-700 hover:border-green-300"
              >
                สัปดาหน์หน้า
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default SimpleDatePicker;
