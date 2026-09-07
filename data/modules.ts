import type { ModuleData } from '@/types/erp';

export const modules: Record<string, ModuleData> = {
  purchases: {
    eyebrow: 'CHUỖI CUNG ỨNG',
    title: 'Mua hàng',
    description: 'Theo dõi yêu cầu mua, đơn đặt hàng và tiến độ nhập kho.',
    metrics: [
      { label: 'ĐƠN ĐANG MỞ', value: '18', note: '6 đơn chờ duyệt' },
      { label: 'GIÁ TRỊ THÁNG', value: '12,8 tỷ', note: '+6,2% so với tháng trước' },
      { label: 'SẮP ĐẾN HẠN', value: '5', note: 'Trong 72 giờ tới' },
    ],
    activity: [
      'PO-260824-009 · Petrolimex Sài Gòn · Chờ xác nhận',
      'PO-260823-016 · Nhà máy Dầu nhờn AP · Đang nhận hàng',
      'PO-260822-011 · Tổng kho Miền Đông · Đã hoàn tất',
    ],
  },
  fleet: {
    eyebrow: 'ĐIỀU PHỐI',
    title: 'Đội xe & vận tải',
    description: 'Giám sát hành trình, lịch bảo dưỡng và năng lực giao hàng.',
    metrics: [
      { label: 'XE ĐANG CHẠY', value: '18 / 24', note: '75% đội xe' },
      { label: 'GIAO ĐÚNG HẸN', value: '96,4%', note: '+2,1 điểm tuần này' },
      { label: 'BẢO DƯỠNG', value: '3 xe', note: '1 xe cần xử lý sớm' },
    ],
    activity: [
      '51D-482.17 · Đang đến CHXD Minh Phát · ETA 10:35',
      '50H-229.64 · Đã nhận hàng tại Kho Nhà Bè',
      '60C-718.02 · Bảo dưỡng định kỳ · Hoàn tất 26/08',
    ],
  },
  finance: {
    eyebrow: 'KIỂM SOÁT TÀI CHÍNH',
    title: 'Tài chính & công nợ',
    description: 'Dòng tiền, hóa đơn, thanh toán và sổ cái trên một màn hình.',
    metrics: [
      { label: 'TIỀN VỀ THÁNG', value: '15,16 tỷ', note: '82% doanh thu' },
      { label: 'PHẢI THU', value: '3,26 tỷ', note: '14 hóa đơn quá hạn' },
      { label: 'LỢI NHUẬN GỘP', value: '1,92 tỷ', note: 'Biên 10,4%' },
    ],
    activity: [
      'INV-260824-128 · 428,5 triệu · Chờ thanh toán',
      'PAY-260824-044 · 312,8 triệu · Đã đối soát',
      'INV-260815-097 · 186,2 triệu · Quá hạn 4 ngày',
    ],
  },
  hr: {
    eyebrow: 'CON NGƯỜI',
    title: 'Nhân sự',
    description: 'Hồ sơ, chấm công, lương và đánh giá hiệu suất.',
    metrics: [
      { label: 'NHÂN SỰ', value: '248', note: '12 phòng ban' },
      { label: 'HIỆN DIỆN', value: '236', note: '95,2% hôm nay' },
      { label: 'ĐÁNH GIÁ MỞ', value: '42', note: 'Kỳ Q3/2026' },
    ],
    activity: [
      'Đánh giá Q3 · 42 hồ sơ còn mở',
      'Bảng lương tháng 8 · Chờ giám đốc duyệt',
      'Nhân sự mới · 4 hồ sơ đang onboarding',
    ],
  },
  tasks: {
    eyebrow: 'PHỐI HỢP',
    title: 'Công việc & phê duyệt',
    description: 'Giao việc định lượng, theo dõi SLA và duyệt theo vai trò.',
    metrics: [
      { label: 'CẦN TÔI DUYỆT', value: '8', note: '3 yêu cầu mức cao' },
      { label: 'ĐANG THỰC HIỆN', value: '34', note: '92% đúng SLA' },
      { label: 'HOÀN TẤT TUẦN', value: '67', note: '+11 so với tuần trước' },
    ],
    activity: [
      'Duyệt hạn mức tín dụng · CHXD Hoàng Gia',
      'Xác nhận điều chỉnh tồn kho · Kho Cát Lái',
      'Đánh giá nhà cung cấp · Petrolimex Sài Gòn',
    ],
  },
};