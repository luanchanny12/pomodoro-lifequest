import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts'

interface PomodoroStatsChartProps {
  stats: {
    last_7_days: Array<{ date: string; hours: number }>
  } | null
}

export default function PomodoroStatsChart({ stats }: PomodoroStatsChartProps) {
  return (
    <div className="bg-black/35 backdrop-blur-xl border border-white/20 rounded-2xl p-4">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-white/80 mb-4">
        Giờ học 7 ngày qua
      </h4>
      <div className="h-44 w-full">
        {stats && stats.last_7_days.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.last_7_days}>
              <XAxis
                dataKey="date"
                stroke="rgba(255,255,255,0.6)"
                fontSize={11}
                tickLine={false}
              />
              <YAxis
                stroke="rgba(255,255,255,0.6)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                unit="h"
              />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: '#1F232B',
                  borderColor: 'rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '12px',
                }}
                formatter={(val: any) => [`${val} giờ`, 'Thời gian']}
              />
              <Bar dataKey="hours" fill="#ffffff" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-xs text-white/50">
            Chưa có đủ dữ liệu
          </div>
        )}
      </div>
    </div>
  )
}
