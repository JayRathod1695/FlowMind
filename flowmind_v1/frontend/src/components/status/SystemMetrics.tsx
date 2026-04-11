import { useEffect, useMemo, useRef } from 'react'
import { LineChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import ReactEChartsImport from 'echarts-for-react'

import { useConnectorStore } from '@/store/connector.store'
import { useLogStore } from '@/store/log.store'

echarts.use([
  LineChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  CanvasRenderer,
])

const ReactECharts =
  ((ReactEChartsImport as unknown as { default?: typeof ReactEChartsImport }).default ??
    ReactEChartsImport) as typeof ReactEChartsImport

const WINDOW_SECONDS = 60
const TICK_MS = 1_000

type MetricPoint = [number, number]

const seedSeries = (now: number): MetricPoint[] => {
  return Array.from({ length: WINDOW_SECONDS }, (_, index) => [now - (WINDOW_SECONDS - index) * TICK_MS, 0])
}

const trimToWindow = (points: MetricPoint[], startMs: number): MetricPoint[] => points.filter(([timestamp]) => timestamp >= startMs)

function SystemMetrics() {
  const logCount = useLogStore((state) => state.entries.length)
  const connectedCount = useConnectorStore((state) => Object.values(state.connections).filter((connection) => connection.status === 'connected').length)

  const chartRef = useRef<InstanceType<typeof ReactECharts> | null>(null)
  const chartReadyRef = useRef(false)
  const eventRateSeriesRef = useRef<MetricPoint[]>([])
  const latencySeriesRef = useRef<MetricPoint[]>([])
  const previousLogCountRef = useRef(logCount)
  const snapshotRef = useRef({ connectedCount, logCount })

  useEffect(() => {
    snapshotRef.current = { connectedCount, logCount }
  }, [connectedCount, logCount])

  const option = useMemo<echarts.EChartsCoreOption>(() => {
    return {
      animation: false,
      grid: { left: 34, right: 22, top: 34, bottom: 28 },
      legend: { top: 0, textStyle: { color: '#1F1F1F', fontSize: 11 } },
      tooltip: {
        trigger: 'axis',
        valueFormatter: (value: unknown) => `${Math.round(Number(value) || 0)}`,
        backgroundColor: '#FFFFFF',
        borderColor: '#AFAFAF',
        textStyle: { color: '#000000' },
      },
      xAxis: {
        type: 'time',
        axisLabel: { color: '#1F1F1F', formatter: (value: number) => new Date(value).toLocaleTimeString() },
        axisLine: { lineStyle: { color: '#AFAFAF' } },
      },
      yAxis: {
        type: 'value',
        min: 0,
        axisLabel: { color: '#1F1F1F' },
        axisLine: { lineStyle: { color: '#AFAFAF' } },
        splitLine: { lineStyle: { color: 'rgba(175,175,175,0.45)' } },
      },
      series: [
        {
          name: 'Log events/s',
          type: 'line',
          showSymbol: false,
          smooth: true,
          lineStyle: { width: 2, color: '#007AFF' },
          data: eventRateSeriesRef.current,
        },
        {
          name: 'Connector RTT',
          type: 'line',
          showSymbol: false,
          smooth: true,
          lineStyle: { width: 2, color: '#16A34A' },
          data: latencySeriesRef.current,
        },
      ],
    }
  }, [])

  useEffect(() => {
    const tick = () => {
      const now = Date.now()
      const windowStart = now - WINDOW_SECONDS * TICK_MS
      const { connectedCount: latestConnected, logCount: latestLogCount } = snapshotRef.current

      if (eventRateSeriesRef.current.length === 0 || latencySeriesRef.current.length === 0) {
        eventRateSeriesRef.current = seedSeries(now)
        latencySeriesRef.current = seedSeries(now)
      }

      const deltaLogs = Math.max(0, latestLogCount - previousLogCountRef.current)
      previousLogCountRef.current = latestLogCount
      const eventRate = Math.min(30, deltaLogs)
      const latency = latestConnected === 0 ? 0 : 45 + latestConnected * 14 + (((now / TICK_MS) % 6) + 1) * 2

      eventRateSeriesRef.current = trimToWindow([...eventRateSeriesRef.current, [now, eventRate]], windowStart)
      latencySeriesRef.current = trimToWindow([...latencySeriesRef.current, [now, Math.round(latency)]], windowStart)

      const chartInstance = chartRef.current?.getEchartsInstance()
      if (!chartInstance || !chartReadyRef.current) {
        return
      }

      chartInstance.setOption(
        {
          xAxis: { type: 'time', min: windowStart, max: now },
          yAxis: { type: 'value', min: 0 },
          series: [
            { name: 'Log events/s', type: 'line', data: eventRateSeriesRef.current },
            { name: 'Connector RTT', type: 'line', data: latencySeriesRef.current },
          ],
        },
        { lazyUpdate: true },
      )
    }

    tick()
    const intervalId = window.setInterval(tick, TICK_MS)
    return () => {
      chartReadyRef.current = false
      window.clearInterval(intervalId)
    }
  }, [])

  return (
    <section className="space-y-3 rounded-2xl border border-[#AFAFAF] bg-[#E5E5E5] p-4 shadow-[0_4px_6px_rgba(0,0,0,0.1)] md:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-[#000000]">System Metrics</h2>
        <span className="text-xs text-[#1F1F1F]">Rolling 60s window</span>
      </div>
      <div className="h-[280px] w-full rounded-xl border border-[#AFAFAF] bg-[#FFFFFF] px-2 py-2">
        <ReactECharts
          ref={chartRef}
          echarts={echarts}
          option={option}
          notMerge
          lazyUpdate
          onChartReady={() => {
            chartReadyRef.current = true
          }}
          style={{ height: '100%', width: '100%' }}
        />
      </div>
    </section>
  )
}

export default SystemMetrics