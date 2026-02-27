"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts"

interface OverviewProps {
  data: {
    name: string
    collected: number
    pending: number
    unpaid: number
  }[]
}

export function Overview({ data }: OverviewProps) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis
          dataKey="name"
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `₹${value}`}
        />
        <Tooltip 
            cursor={{ fill: 'transparent' }}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
        />
        <Legend />
        <Bar
          dataKey="collected"
          name="Collected"
          fill="#16a34a" // Green
          radius={[0, 0, 4, 4]}
          stackId="a"
        />
        <Bar
          dataKey="pending"
          name="Pending"
          fill="#eab308" // Yellow
          radius={[0, 0, 0, 0]}
          stackId="a"
        />
        <Bar
          dataKey="unpaid"
          name="Unpaid (Deficit)"
          fill="#ef4444" // Red
          radius={[4, 4, 0, 0]}
          stackId="a"
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
