/** Staff avatar path by Thai name or id_code */
export const STAFF_IMAGES: Record<string, string> = {
  จรัญ: "/images/staff/จรัญ.jpeg",
  แมน: "/images/staff/แมน.jpg",
  แจ็ค: "/images/staff/แจ็ค.jpg",
  ป้าน้อย: "/images/staff/ป้าน้อย.jpg",
  พี่ตุ่น: "/images/staff/พี่ตุ่น.jpg",
  เอ: "/images/staff/เอ.jpg",
  โอเล่: "/images/staff/โอเล่.jpg",
  พี่ภา: "/images/staff/พี่ภา.jpg",
  อาร์ม: "/images/staff/อาร์ม.jpg",
  สาม: "/images/staff/สาม.jpg",
  มิ้นต์: "/placeholder.svg?height=80&width=80&text=มิ้นต์",
  นิค: "/placeholder.svg?height=80&width=80&text=นิค",
  เกลือ: "/placeholder.svg?height=80&width=80&text=เกลือ",
  เป้ง: "/placeholder.svg?height=80&width=80&text=เป้ง",
  arm: "/images/staff/อาร์ม.jpg",
  saam: "/images/staff/สาม.jpg",
  toon: "/images/staff/พี่ตุ่น.jpg",
  man: "/images/staff/แมน.jpg",
  sanya: "/images/staff/พี่สัญญา.jpg",
  noi: "/images/staff/ป้าน้อย.jpg",
  pha: "/images/staff/พี่ภา.jpg",
  ae: "/images/staff/เอ.jpg",
  rd: "/images/staff/RD.jpg",
  Ola: "/images/staff/โอเล่.jpg",
  JJ: "/images/staff/จรัญ.jpeg",
  Jak: "/images/staff/แจ็ค.jpg",
};

export function getStaffImage(nameOrCode: string, fallbackText?: string): string {
  if (STAFF_IMAGES[nameOrCode]) return STAFF_IMAGES[nameOrCode];
  const text = fallbackText || nameOrCode.charAt(0) || "?";
  return `/placeholder.svg?height=80&width=80&text=${encodeURIComponent(text)}`;
}
