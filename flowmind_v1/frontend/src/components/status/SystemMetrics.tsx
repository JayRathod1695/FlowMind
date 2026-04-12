import ReactECharts from 'echarts-for-react';
import { useTheme } from '../theme-provider';

export function SystemMetrics() {
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const axisColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';
  const splitColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)';
  const tooltipBg = isDark ? '#1a1a1a' : '#ffffff';
  const tooltipBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const tooltipText = isDark ? '#fff' : '#000';

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: tooltipBg,
      borderColor: tooltipBorder,
      textStyle: { color: tooltipText }
    },
    grid: {
      left: '0%',
      right: '0%',
      bottom: '0%',
      top: '10%',
      containLabel: true
    },
    xAxis: [
      {
        type: 'category',
        boundaryGap: false,
        data: ['1h', '2h', '3h', '4h', '5h', '6h'],
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: axisColor, margin: 20 }
      }
    ],
    yAxis: [
      {
        type: 'value',
        splitLine: {
          lineStyle: { color: splitColor, type: 'dashed' }
        },
        axisLabel: { show: false }
      }
    ],
    series: [
      {
        name: 'Execution Latency',
        type: 'line',
        smooth: 0.4,
        symbol: 'none',
        lineStyle: { width: 3, color: 'hsl(0, 100%, 43%)' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{
              offset: 0, color: 'hsla(0, 100%, 43%, 0.3)'
            }, {
              offset: 1, color: 'hsla(0, 100%, 43%, 0)'
            }]
          }
        },
        data: [120, 90, 80, 160, 240, 240]
      }
    ]
  };

  return (
    <div className="flex flex-col h-[280px] w-full relative">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center gap-2 text-primary font-bold text-sm">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
          Performance History
        </div>
      </div>
      <p className="text-muted-foreground text-xs mb-4">Watch how the flow latency performs throughout the day.</p>
      <div className="flex-1 w-[100%] min-h-0 relative -ml-4">
        <ReactECharts option={option} style={{ height: '100%', width: '105%' }} />
      </div>
    </div>
  );
}
