import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utility functions for common operations

import type { ProductionItem } from '../types/production';

// Helper function to get operators as array
export const getOperatorsArray = (operators: any): string[] => {
  // Handle null, undefined, or empty values
  if (!operators) return [];
  
  // Handle arrays
  if (Array.isArray(operators)) {
    return operators.map(op => {
      if (typeof op === 'object' && op !== null) {
        return op.name || op.id_code || '';
      }
      return String(op || '');
    }).filter(op => op.trim());
  }
  
  // Handle strings
  if (typeof operators === 'string') {
    return operators.split(', ').map(op => op.trim()).filter(op => op);
  }
  
  // Handle objects (ถ้า operators เป็น JSON)
  if (typeof operators === 'object') {
    try {
      // ถ้าเป็น object ที่มี name หรือ id_code
      if (operators.name || operators.id_code) {
        return [operators.name || operators.id_code || ''].filter(op => op.trim());
      }
      
      // ลอง parse เป็น JSON
      const parsed = JSON.parse(JSON.stringify(operators));
      if (Array.isArray(parsed)) {
        return parsed.map(op => {
          if (typeof op === 'object' && op !== null) {
            return op.name || op.id_code || '';
          }
          return String(op || '');
        }).filter(op => op.trim());
      }
    } catch {
      // ถ้า parse ไม่ได้ให้ return empty array
    }
  }
  
  // Fallback: convert to string
  return [String(operators).trim()].filter(op => op);
};

// Helper function to get operators as string
export const getOperatorsString = (operators: string | string[]): string => {
  if (Array.isArray(operators)) {
    return operators.join(', ');
  }
  return operators || '';
};

// Helper function to check if item is draft
export const isDraftItem = (item: ProductionItem): boolean => {
  // ✅ เพิ่มการเช็ค workflow_status = 'draft' (Backend ใช้ workflow_status)
  return item.is_draft === true || 
         item.isDraft === true || 
         item.status === 'draft' ||
         (item as any).workflow_status === 'draft';
};

// Helper function to check if item is special
export const isSpecialItem = (item: ProductionItem): boolean => {
  return item.is_special === true || item.is_special === 1 || item.is_special_job === 1 || item.workflow_status_id === 10;
};

// Helper function to get machine code
export const getMachineCode = (item: ProductionItem): string | undefined => {
  return item.machine_code || (item.machine_id !== undefined ? String(item.machine_id) : undefined);
};

// Helper function to normalize string
export const normalizeString = (str: string): string => {
  return str.trim().toLowerCase().replace(/\s+/g, '');
};

// Helper function to check if time is valid
export const isValidTime = (time: string): boolean => {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
};

// Helper function to compare times
export const isTimeAfter = (time1: string, time2: string): boolean => {
  const [hours1, minutes1] = time1.split(':').map(Number);
  const [hours2, minutes2] = time2.split(':').map(Number);
  
  const totalMinutes1 = hours1 * 60 + minutes1;
  const totalMinutes2 = hours2 * 60 + minutes2;
  
  return totalMinutes1 > totalMinutes2;
};

// Helper function to format duration
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}ชม. ${minutes}นาที`;
  }
  return `${minutes}นาที`;
};

// Helper function to debounce
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// Helper function to throttle
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let lastExecuted = 0;
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastExecuted > delay) {
      func(...args);
      lastExecuted = now;
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func(...args);
        lastExecuted = Date.now();
      }, delay - (now - lastExecuted));
    }
  };
};
