import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface AdminTrafficChartProps {
  chartData: Array<{
    date: string
    guest: number
    member: number
    total?: number
  }>
}

export default function AdminTrafficChart({ chartData }: AdminTrafficChartProps) {
  if (!chartData || chartData.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-slate-400">
        Chưa có đủ dữ liệu lưu lượng
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData}>
        <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" fontSize={11} tickLine={false} />
        <YAxis stroke="rgba(255,255,255,0.5)" fontSize={11} tickLine={false} axisLine={false} />
        <RechartsTooltip
          contentStyle={{
            backgroundColor: '#162032',
            borderColor: 'rgba(255,255,255,0.15)',
            borderRadius: '12px',
            color: '#fff',
            fontSize: '12px',
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
          formatter={(val) => (val === 'guest' ? 'Khách vãng lai' : val === 'member' ? 'Thành viên' : val)}
        />
        <Bar dataKey="guest" name="Khách vãng lai" fill="#06b6d4" radius={[4, 4, 0, 0]} />
        <Bar dataKey="member" name="Thành viên" fill="#f59e0b" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
