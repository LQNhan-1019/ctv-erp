'use client';

import React, { useEffect, useState } from 'react';
import type { Order } from '@/types/erp';

interface DashboardProps {
  orders: Order[];
  onOpen: (order: Order) => void;
  onSales: () => void;
}

// ==========================================
// COMPONENT: BIỂU ĐỒ TRÒN TIẾN ĐỘ (SVG THUẦN)
// ==========================================
const KpiRing = ({ value, target, color, size = 76, strokeWidth = 6 }: { value: number; target: number; color: string; size?: number; strokeWidth?: number; }) => {
  const [offset, setOffset] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percent = Math.min((value / target) * 100, 100);

  // Hiệu ứng animation khi load trang
  useEffect(() => {
    const progressOffset = circumference - (percent / 100) * circumference;
    // Delay nhẹ để tạo hiệu ứng chạy mượt mà
    const timeout = setTimeout(() => setOffset(progressOffset), 100);
    return () => clearTimeout(timeout);
  }, [circumference, percent]);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Vòng tròn nền mờ */}
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#e9edeb" strokeWidth={strokeWidth} fill="transparent" />
        {/* Vòng tròn chạy % */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset || circumference}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      {/* Chữ % hiển thị ở giữa */}
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-[12px] font-bold text-[#152421]">{percent.toFixed(0)}%</span>
      </div>
    </div>
  );
};

// Dữ liệu mẫu (Mock data) cho Cửa hàng
const chxdData = [
  { id: '01', name: 'CHXD 01', volume: 120, profit: 15 },
  { id: '03', name: 'CHXD 03', volume: 95, profit: 11 },
  { id: '05', name: 'CHXD 05', volume: 165, profit: 22 },
  { id: '07', name: 'CHXD 07', volume: 110, profit: 14 },
  { id: '09', name: 'CHXD 09', volume: 85, profit: 9 },
];
const maxVolume = Math.max(...chxdData.map((d) => d.volume));

export default function Dashboard({ orders, onOpen, onSales }: DashboardProps) {
  return (
    <div className="nova-account-page">
      <header className="nova-page-header !flex-col md:!flex-row !items-start md:!items-end gap-4 md:gap-6">
        <div className="w-full">
          <span className="nova-eyebrow text-[#0f766e]">TỔNG QUAN HỆ THỐNG</span>
          <h1 className="text-2xl md:text-3xl">Dashboard Chỉ số Vận hành</h1>
          <span className="text-xs md:text-[11px]">Dữ liệu báo cáo cập nhật từ các phòng ban (Tháng 9/2026).</span>
        </div>
        <div className="nova-status-tabs w-full md:w-auto flex overflow-x-auto hide-scrollbar">
          <button className="active whitespace-nowrap flex-1 md:flex-none">Tháng 9</button>
          <button className="whitespace-nowrap flex-1 md:flex-none">Tháng 10</button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        
        {/* ================= Ô 1: P. TCKT ================= */}
        <div className="nova-account-panel col-span-1 p-4 md:p-5 border border-[#dfe5e2] rounded-xl bg-white flex flex-col shadow-sm">
          <div className="flex items-center gap-3 mb-5 pb-3 border-b border-[#e9edeb]">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#e5f0ed] text-[#276e64] font-bold">TC</span>
            <h3 className="m-0 text-[#152421] font-[var(--font-playfair)] font-medium text-lg">Phòng TCKT</h3>
          </div>
          
          <div className="flex-1 flex flex-col gap-5">
            {/* KPI Doanh Thu kèm Biểu đồ tròn */}
            <div className="flex items-center justify-between pb-4 border-b border-[#f0f3f2]">
              <div>
                <span className="text-[#83908c] text-[9px] font-bold tracking-widest uppercase">Doanh thu / KPI (20K)</span>
                <strong className="text-[#0f7168] text-xl md:text-2xl mt-1 block">15,400 <small className="inline text-[10px] md:text-xs font-normal">tr</small></strong>
              </div>
              <KpiRing value={15400} target={20000} color="#0f7168" />
            </div>

            <article className="!border-none !p-0">
              <span className="text-[#83908c] text-[9px] font-bold tracking-widest uppercase">Lãi gộp bán hàng</span>
              <strong className="text-[#276e64] text-xl md:text-2xl mt-1 block">1,250 <small className="inline text-[10px] md:text-xs font-normal">triệu</small></strong>
            </article>
            <article className="!border-none !p-0">
              <span className="text-[#83908c] text-[9px] font-bold tracking-widest uppercase">Công nợ (Blue Day)</span>
              <strong className="text-[#d26a52] text-xl md:text-2xl mt-1 block">12 <small className="inline text-[10px] md:text-xs font-normal">KH quá hạn</small></strong>
            </article>
          </div>
        </div>

        {/* ================= Ô 2: HCNS & TRỢ LÝ ================= */}
        <div className="flex flex-col gap-4 md:gap-6 col-span-1">
          <div className="nova-account-panel p-4 md:p-5 border border-[#dfe5e2] rounded-xl bg-white flex-1 shadow-sm">
            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-[#e9edeb]">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#eef3f1] text-[#66827b] font-bold">HC</span>
              <h3 className="m-0 text-[#152421] font-[var(--font-playfair)] font-medium text-lg">Phòng HCNS</h3>
            </div>
            
            {/* KPI Công việc */}
            <div className="flex items-center justify-between">
              <article className="!border-none !p-0">
                <span className="text-[#83908c] text-[9px] font-bold tracking-widest uppercase">CV hoàn thành / KPI</span>
                <strong className="text-[#0f7168] text-xl md:text-2xl mt-1 block">42 <small className="inline text-[10px] md:text-xs font-normal">/ 50 SL</small></strong>
              </article>
              <KpiRing value={42} target={50} color="#3b9c72" size={60} strokeWidth={5} />
            </div>
          </div>

          <div className="nova-account-panel p-4 md:p-5 border border-[#dfe5e2] rounded-xl bg-white flex-1 shadow-sm">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#e9edeb]">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#f2f8f6] text-[#26796e] font-bold">TL</span>
              <h3 className="m-0 text-[#152421] font-[var(--font-playfair)] font-medium text-lg">Tổ Trợ lý / Thư ký</h3>
            </div>
            <article className="!border-none !p-0">
              <span className="text-[#83908c] text-[9px] font-bold tracking-widest uppercase">Giao dịch mua bán CHXD</span>
              <strong className="text-[#0f7168] text-xl md:text-2xl mt-1 block">1,452 <small className="inline text-[10px] md:text-xs font-normal">SL</small></strong>
            </article>
          </div>
        </div>

        {/* ================= Ô 3: PHÒNG KINH DOANH TỔNG HỢP ================= */}
        <div className="nova-account-panel col-span-1 lg:col-span-3 p-4 md:p-5 border border-[#dfe5e2] rounded-xl bg-white shadow-sm">
          <div className="flex items-center gap-3 mb-4 md:mb-5 pb-3 border-b border-[#e9edeb]">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#e6f3ec] text-[#267659] font-bold">KD</span>
            <h3 className="m-0 text-[#152421] font-[var(--font-playfair)] font-medium text-lg">Phòng Kinh Doanh Tổng Hợp</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-8">
            {/* CỘT TRÁI: KPI & THÔNG SỐ */}
            <div className="flex flex-col gap-3 md:gap-4">
              <div className="p-3 md:p-4 border border-[#e0e6e3] rounded-xl bg-[#f8faf9] flex items-center justify-between">
                <div>
                  <h4 className="text-[10px] font-bold text-[#547b73] mb-2 tracking-[0.15em] uppercase">KPI Tổng Sản Lượng (m³)</h4>
                  <div className="mt-1">
                    <strong className="text-xl md:text-2xl text-[#152421]">1,245</strong>
                    <span className="text-xs text-[#65736f] ml-1">/ 1,500</span>
                  </div>
                </div>
                {/* Biểu đồ KPI Sản lượng */}
                <KpiRing value={1245} target={1500} color="#2b8c7e" size={68} />
              </div>

              <div className="p-3 md:p-4 border border-[#e0e6e3] rounded-xl bg-[#f8faf9]">
                <h4 className="text-[10px] font-bold text-[#547b73] mb-2 md:mb-3 tracking-[0.15em] uppercase">Đội xe bồn (51C 59814)</h4>
                <div className="flex justify-between items-end border-b border-[#e9edeb] pb-2 mb-2">
                  <span className="text-[11px] text-[#65736f] font-medium">Tổng KM chạy / tháng</span>
                  <b className="text-xs md:text-[13px] text-[#152421]">1,240 km</b>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-[11px] text-[#65736f] font-medium">Doanh thu vận tải</span>
                  <b className="text-xs md:text-[13px] text-[#3b9c72]">45 triệu</b>
                </div>
              </div>
            </div>

            {/* CỘT PHẢI: BIỂU ĐỒ CỘT SO SÁNH CHXD */}
            <div className="flex flex-col h-full mt-2 lg:mt-0">
              <h4 className="text-[10px] font-bold text-[#547b73] mb-4 md:mb-5 tracking-[0.15em] uppercase">Sản lượng các CHXD (m³)</h4>
              
              <div className="flex-1 w-full overflow-x-auto hide-scrollbar">
                <div className="min-w-[300px] flex items-end justify-between gap-2 h-40 md:h-48 pb-2 border-b border-[#e9edeb] relative pt-6">
                  
                  <div className="absolute inset-x-0 top-6 border-t border-dashed border-[#e4eae7]"></div>
                  <div className="absolute inset-x-0 top-[55%] border-t border-dashed border-[#e4eae7]"></div>

                  {chxdData.map((chxd) => {
                    const heightPercent = (chxd.volume / maxVolume) * 100;
                    return (
                      <div key={chxd.id} className="relative flex flex-col items-center justify-end w-full h-full group cursor-pointer" tabIndex={0}>
                        <div className="absolute -top-7 bg-[#153a35] text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity z-10 whitespace-nowrap shadow-md pointer-events-none">
                          Lãi: {chxd.profit} tr
                        </div>
                        <span className="text-[10px] font-bold text-[#276e64] mb-1">{chxd.volume}</span>
                        <div 
                          className="w-full max-w-[36px] md:max-w-[42px] bg-gradient-to-t from-[#1b5e54] to-[#2b8c7e] rounded-t-md transition-all duration-700 ease-out shadow-sm group-hover:brightness-110 group-active:brightness-90"
                          style={{ height: `${heightPercent}%` }}
                        ></div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="min-w-[300px] flex justify-between mt-2 md:mt-3 px-1">
                  {chxdData.map((chxd) => (
                    <span key={chxd.id} className="text-[9px] font-medium text-[#7a8783] text-center w-full max-w-[36px] md:max-w-[42px]">
                      CH {chxd.id}
                    </span>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}