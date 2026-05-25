"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

export function TimeSeriesCard({
  title,
  description,
  data,
  dataKey,
  color = "var(--chart-1)",
}: {
  title: string
  description?: string
  data: { date: string; value: number }[]
  dataKey?: string
  color?: string
}) {
  const key = dataKey ?? "value"
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{ [key]: { label: title, color } }}
          className="h-[220px] w-full"
        >
          <AreaChart data={data} margin={{ left: 4, right: 4, top: 4, bottom: 0 }}>
            <defs>
              <linearGradient id={`fill-${key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
              tickFormatter={(v) => {
                const d = new Date(v)
                return `${d.getMonth() + 1}/${d.getDate()}`
              }}
            />
            <YAxis hide />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
            <Area
              dataKey="value"
              type="monotone"
              stroke={color}
              fill={`url(#fill-${key})`}
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
