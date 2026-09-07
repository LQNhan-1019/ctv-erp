import type { Order } from '@/types/erp';

export const revenue = [44, 51, 48, 62, 59, 71, 68, 83, 77, 91, 86, 96];

export const seedOrders: Order[] = [
  { id: 'SO-260824-018', customer: 'CHXD Minh Phát', channel: 'Đại lý', warehouse: 'Kho Cát Lái', date: '24/08/2026', value: 428500000, status: 'Đang giao', tone: 'blue', items: 3 },
  { id: 'SO-260824-017', customer: 'Công ty Vận tải Đông Nam', channel: 'Doanh nghiệp', warehouse: 'Kho Nhà Bè', date: '24/08/2026', value: 312800000, status: 'Đã xác nhận', tone: 'green', items: 2 },
  { id: 'SO-260824-016', customer: 'CHXD Hoàng Gia', channel: 'Đại lý', warehouse: 'Kho Cát Lái', date: '24/08/2026', value: 186200000, status: 'Chờ duyệt', tone: 'amber', items: 2 },
  { id: 'SO-260823-042', customer: 'HTX Vận tải Hòa Bình', channel: 'Doanh nghiệp', warehouse: 'Kho Đồng Nai', date: '23/08/2026', value: 594000000, status: 'Đã giao', tone: 'green', items: 4 },
  { id: 'SO-260823-039', customer: 'CHXD Thành Công 02', channel: 'Nội bộ', warehouse: 'Kho Bình Dương', date: '23/08/2026', value: 247600000, status: 'Đã xuất hóa đơn', tone: 'violet', items: 3 },
  { id: 'SO-260822-035', customer: 'Công ty Logistics An Khang', channel: 'Doanh nghiệp', warehouse: 'Kho Nhà Bè', date: '22/08/2026', value: 735400000, status: 'Quá hạn giao', tone: 'red', items: 5 },
];