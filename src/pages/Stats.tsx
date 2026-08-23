/**
 * Stats 数据统计页（飞书极简风 + 暗色适配）
 *
 * 1. 顶部「日 / 月 / 年」三段切换（海蓝选中）
 * 2. 番茄钟饼图：各任务专注时长占比（图例右侧，色块取任务标签色）
 *    - 日视图：按具体任务（含子任务）统计
 *    - 月/年视图：仅按主任务统计，子任务时长沿 parentTaskId 链向上归并
 * 3. 月度热力图（GitHub 风格）：当月每天专注分钟，海蓝色系渐变
 * 4. 入睡折线图（仅月视图）：y 轴 21:00 → 05:00 连续
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import * as echarts from 'echarts';
// 项目共享类型：Task（parentTaskId 为空表示主任务）、Tag（color 用于饼图色块）、
// FocusSession（番茄钟专注记录，startedAt 为 ISO 字符串）、SleepRecord（date/bedtime）
import type { Task, Tag, FocusSession, SleepRecord } from '../types';

/* ==================== 常量与工具函数 ==================== */
/** 海蓝主题色（与全局强调色一致） */
const OCEAN_BLUE = '#3d7ea6';
/** 无标签（或任务已删除）时饼图的回退色，中性灰 */
const FALLBACK_COLOR = '#6b7280';
/** 图表主文字色（图例等，明暗模式通用） */
const TEXT_PRIMARY = '#666';
/** 图表次级文字色（坐标轴等） */
const TEXT_SECONDARY = '#999';
/** 热力图星期标签：周一 → 周日 */
const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

/** 数字补零为两位字符串 */
const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Date → 'YYYY-MM-DD' */
const toISODate = (d: Date): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/** Date → 'YYYY-MM' */
const toISOMonth = (d: Date): string => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;

/**
 * 'HH:MM' → 距 21:00 经过的小时数（21:00 为 0，次日 05:00 为 8）
 * 例：23:30 → 2.5；00:15 → 3.25。非法输入返回 -1
 */
const bedtimeToHours = (bedtime: string): number => {
  const parts = bedtime.split(':');
  if (parts.length < 2) return -1;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (Number.isNaN(h) || Number.isNaN(m)) return -1;
  return ((h + m / 60 - 21) % 24 + 24) % 24;
};

/** 距 21:00 的小时数 → 'HH:MM'（0 → 21:00，8 → 05:00），用于 y 轴标签 */
const hoursToBedtimeLabel = (hours: number): string => {
  const totalMinutes = (21 * 60 + Math.round(hours * 60)) % (24 * 60);
  return `${pad2(Math.floor(totalMinutes / 60))}:${pad2(totalMinutes % 60)}`;
};

/** 空数据占位提示（卡片内居中） */
function EmptyTip() {
  return (
    <div className="flex h-56 items-center justify-center text-sm text-neutral-400 dark:text-neutral-500">
      暂无数据，先去专注一个🍅吧
    </div>
  );
}

/** 通用图表卡片：标题 + 内容区 */
function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="mb-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">{title}</h2>
      {children}
    </section>
  );
}

/* ==================== 页面组件 ==================== */
export default function Stats({ focusSessions, sleepRecords, tasks, tags }: {
  focusSessions: FocusSession[];
  sleepRecords: SleepRecord[];
  tasks: Task[];
  tags: Tag[];
}) {
  /** 当前视图：日 / 月 / 年 */
  const [viewMode, setViewMode] = useState<'day' | 'month' | 'year'>('month');

  /** 三个图表的 DOM 挂载点 */
  const pieRef = useRef<HTMLDivElement>(null);
  const heatmapRef = useRef<HTMLDivElement>(null);
  const sleepRef = useRef<HTMLDivElement>(null);

  /** 时间基准（页面加载时刻），用于确定「今天 / 本月 / 今年」的统计范围 */
  const now = useMemo(() => new Date(), []);
  const todayStr = toISODate(now);
  const monthStr = toISOMonth(now);
  const yearStr = String(now.getFullYear());

  /** 任务索引表，便于按 id 查找 */
  const taskMap = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  /** 取任务标签色，无标签（或任务已删除）时回退为中性灰 */
  const tagColorOf = (task: Task | undefined): string =>
    (task && tags.find((tag) => tag.id === task.tagId)?.color) || FALLBACK_COLOR;

  /** 沿 parentTaskId 链向上找到最顶层主任务 id（带环保护） */
  const rootTaskIdOf = (taskId: string): string => {
    let current = taskMap.get(taskId);
    let rootId = taskId;
    const visited = new Set<string>([taskId]);
    while (current && current.parentTaskId && !visited.has(current.parentTaskId)) {
      visited.add(current.parentTaskId);
      rootId = current.parentTaskId;
      current = taskMap.get(current.parentTaskId);
    }
    return rootId;
  };

  /* ---------- 1. 番茄钟饼图数据 ---------- */
  /** 当前视图范围内的专注记录（统计口径：startedAt 的日期部分归属当天） */
  const periodSessions = useMemo(() => {
    return focusSessions.filter((s) => {
      const day = s.startedAt.slice(0, 10);
      if (viewMode === 'day') return day === todayStr;
      if (viewMode === 'month') return day.slice(0, 7) === monthStr;
      return day.slice(0, 4) === yearStr; // 年视图
    });
  }, [focusSessions, viewMode, todayStr, monthStr, yearStr]);

  /**
   * 饼图数据：
   * - 日视图：按具体任务（含子任务）逐个统计
   * - 月/年视图：子任务时长沿链并入最顶层主任务
   */
  const pieData = useMemo(() => {
    const minutesByTask = new Map<string, number>();
    for (const session of periodSessions) {
      const key = viewMode === 'day' ? session.taskId : rootTaskIdOf(session.taskId);
      minutesByTask.set(key, (minutesByTask.get(key) ?? 0) + session.minutes);
    }
    return Array.from(minutesByTask.entries())
      .sort((a, b) => b[1] - a[1]) // 按时长降序，图例更易读
      .map(([taskId, value]) => {
        const task = taskMap.get(taskId);
        return { name: task?.title ?? '未知任务', value, itemStyle: { color: tagColorOf(task) } };
      });
  }, [periodSessions, viewMode, taskMap, tags]);

  /* ---------- 2. 月热力图数据 ---------- */
  /** 本月每天的专注总分钟数（热力图固定展示「当月」，与顶部切换无关） */
  const monthMinutesByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of focusSessions) {
      const day = s.startedAt.slice(0, 10);
      if (day.slice(0, 7) !== monthStr) continue;
      map.set(day, (map.get(day) ?? 0) + s.minutes);
    }
    return map;
  }, [focusSessions, monthStr]);

  /** 本月专注总分钟（用于判断空数据） */
  const monthTotalMinutes = useMemo(
    () => Array.from(monthMinutesByDay.values()).reduce((sum, v) => sum + v, 0),
    [monthMinutesByDay]
  );

  /* ---------- 3. 入睡折线图数据 ---------- */
  /** 本月入睡记录：几号 → 'HH:MM'（仅保留日期在当月且格式可解析的记录） */
  const monthBedtimeByDay = useMemo(() => {
    const map = new Map<number, string>();
    for (const r of sleepRecords) {
      if (r.date.slice(0, 7) !== monthStr) continue;
      if (bedtimeToHours(r.bedtime) < 0) continue;
      map.set(Number(r.date.slice(8, 10)), r.bedtime);
    }
    return map;
  }, [sleepRecords, monthStr]);

  /* ==================== 图表初始化 / 自适应 / 销毁 ==================== */
  useEffect(() => {
    const charts: echarts.ECharts[] = [];

    /** 在指定 DOM 上初始化 echarts 实例并装配配置 */
    const mountChart = (el: HTMLDivElement | null, option: echarts.EChartsOption) => {
      if (!el) return;
      const chart = echarts.init(el);
      chart.setOption(option);
      charts.push(chart);
    };

    const year = now.getFullYear();
    const monthIndex = now.getMonth();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    /* ---------- 1. 番茄钟饼图 ---------- */
    if (pieData.length > 0) {
      mountChart(pieRef.current, {
        backgroundColor: 'transparent', // 背景透明，跟随卡片底色（含暗色模式）
        tooltip: { trigger: 'item', formatter: '{b}：{c} 分钟（{d}%）' },
        legend: {
          type: 'scroll', // 任务较多时图例可滚动
          orient: 'vertical',
          right: 8,
          top: 'center',
          icon: 'circle',
          itemWidth: 9,
          itemHeight: 9,
          itemGap: 12,
          textStyle: { color: TEXT_PRIMARY, fontSize: 12 },
        },
        series: [
          {
            type: 'pie',
            radius: ['42%', '70%'], // 环形饼图
            center: ['34%', '50%'], // 中心左移，为右侧图例留空间
            data: pieData,
            avoidLabelOverlap: true,
            itemStyle: { borderColor: 'transparent', borderWidth: 2, borderRadius: 4 },
            label: { show: false },
            labelLine: { show: false },
            emphasis: { scale: true, scaleSize: 6 },
          },
        ],
      });
    }

    /* ---------- 2. 月度专注热力图（GitHub 风格） ---------- */
    if (monthTotalMinutes > 0) {
      // 当月 1 号前需空出的格子数（周一起始）
      const firstDayOffset = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
      const weekCount = Math.ceil((firstDayOffset + daysInMonth) / 7);

      // 单元格数据：[第几周(列), 行下标(已翻转让周一对齐 y 轴顶部), 分钟数, 几号]
      const cells: Array<[number, number, number, number]> = [];
      let maxDayMinutes = 0;
      for (let day = 1; day <= daysInMonth; day++) {
        const minutes = monthMinutesByDay.get(`${monthStr}-${pad2(day)}`) ?? 0;
        maxDayMinutes = Math.max(maxDayMinutes, minutes);
        const weekday = (new Date(year, monthIndex, day).getDay() + 6) % 7; // 0 = 周一
        const weekIndex = Math.floor((firstDayOffset + day - 1) / 7);
        cells.push([weekIndex, WEEKDAY_LABELS.length - 1 - weekday, minutes, day]);
      }

      mountChart(heatmapRef.current, {
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'item',
          formatter: (params) => {
            const p = Array.isArray(params) ? params[0] : params;
            const v = p.value as number[]; // [第几周, 行下标, 分钟数, 几号]
            return `${monthIndex + 1}月${v[3]}日<br/>专注 ${v[2]} 分钟`;
          },
        },
        grid: { left: 44, right: 12, top: 8, bottom: 44 },
        xAxis: {
          type: 'category',
          data: Array.from({ length: weekCount }, (_, i) => `第${i + 1}周`),
          axisLine: { show: false },
          axisTick: { show: false },
          splitArea: { show: false },
          axisLabel: { color: TEXT_SECONDARY, fontSize: 11 },
        },
        yAxis: {
          type: 'category',
          data: [...WEEKDAY_LABELS].reverse(), // 自上而下：周一 → 周日
          axisLine: { show: false },
          axisTick: { show: false },
          splitArea: { show: false },
          axisLabel: { color: TEXT_SECONDARY, fontSize: 11 },
        },
        visualMap: {
          min: 0,
          max: Math.max(1, maxDayMinutes), // max = 当日最大值（全 0 时兜底为 1）
          calculable: false,
          orient: 'horizontal',
          left: 'center',
          bottom: 0,
          text: ['多', '少'],
          textStyle: { color: TEXT_SECONDARY, fontSize: 11 },
          inRange: { color: ['#e8f1f7', '#c3d9e8', '#94bcd6', '#5f94b8', OCEAN_BLUE] }, // 海蓝渐变，0 最浅
        },
        series: [
          {
            type: 'heatmap',
            data: cells,
            itemStyle: { borderRadius: 3, borderColor: 'transparent', borderWidth: 2 },
            emphasis: { itemStyle: { shadowBlur: 6, shadowColor: 'rgba(51, 112, 255, 0.4)' } },
          },
        ],
      });
    }

    /* ---------- 3. 入睡时间折线图（仅月视图） ---------- */
    if (viewMode === 'month' && monthBedtimeByDay.size > 0) {
      const xData: string[] = [];
      const yData: Array<number | null> = [];
      const bedtimeList: Array<string | null> = [];
      for (let day = 1; day <= daysInMonth; day++) {
        xData.push(`${day}日`);
        const bedtime = monthBedtimeByDay.get(day);
        if (bedtime) {
          bedtimeList.push(bedtime);
          // 换算为「距 21:00 的小时数」并夹在 0~8（21:00~05:00）区间内
          yData.push(Math.min(8, Math.max(0, bedtimeToHours(bedtime))));
        } else {
          bedtimeList.push(null);
          yData.push(null); // 无数据的日期置空，折线断开跳过
        }
      }

      mountChart(sleepRef.current, {
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis',
          formatter: (params) => {
            const p = Array.isArray(params) ? params[0] : params;
            const bedtime = bedtimeList[p.dataIndex];
            return bedtime
              ? `${monthIndex + 1}月${p.dataIndex + 1}日<br/>入睡 ${bedtime}`
              : `${monthIndex + 1}月${p.dataIndex + 1}日<br/>无入睡记录`;
          },
        },
        grid: { left: 48, right: 20, top: 16, bottom: 28 },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: xData,
          axisLine: { lineStyle: { color: '#d4d4d4' } },
          axisTick: { show: false },
          axisLabel: { color: TEXT_SECONDARY, fontSize: 11 },
        },
        yAxis: {
          type: 'value',
          min: 0,
          max: 8,
          interval: 1, // 每小时一格，自下而上 21:00 → 05:00 连续
          axisLabel: {
            color: TEXT_SECONDARY,
            fontSize: 11,
            formatter: (value: number) => hoursToBedtimeLabel(value), // 标签显示 HH:MM
          },
          splitLine: { lineStyle: { color: 'rgba(0, 0, 0, 0.06)' } },
        },
        series: [
          {
            type: 'line',
            data: yData,
            connectNulls: false, // 无数据的日期跳过，不连线
            symbol: 'circle',
            symbolSize: 7,
            lineStyle: { color: OCEAN_BLUE, width: 2 },
            itemStyle: { color: OCEAN_BLUE },
            emphasis: { focus: 'series' },
          },
        ],
      });
    }

    /* ---------- 窗口尺寸变化时自适应；依赖变化 / 组件卸载时销毁 ---------- */
    const handleResize = () => charts.forEach((chart) => chart.resize());
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      charts.forEach((chart) => chart.dispose());
    };
  }, [viewMode, now, pieData, monthMinutesByDay, monthTotalMinutes, monthBedtimeByDay]);

  /** 三段切换选项 */
  const viewOptions: Array<{ key: 'day' | 'month' | 'year'; label: string }> = [
    { key: 'day', label: '日' },
    { key: 'month', label: '月' },
    { key: 'year', label: '年' },
  ];

  return (
    <div className="p-6">
      {/* 顶部：标题 + 日/月/年三段切换 */}
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">数据统计</h1>
        <div className="flex rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800">
          {viewOptions.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setViewMode(key)}
              className={`rounded-md px-4 py-1 text-sm transition-colors ${
                viewMode === key
                  ? 'bg-[#3d7ea6] text-white shadow-sm' // 海蓝选中
                  : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="space-y-4">
        {/* 卡片一：番茄钟专注时长占比 */}
        <ChartCard title="番茄钟专注时长占比">
          {pieData.length > 0 ? (
            <div ref={pieRef} style={{ height: 320, width: '100%' }} />
          ) : (
            <EmptyTip />
          )}
        </ChartCard>

        {/* 卡片二：月度专注热力图（当月） */}
        <ChartCard title="本月专注热力图">
          {monthTotalMinutes > 0 ? (
            <div ref={heatmapRef} style={{ height: 240, width: '100%' }} />
          ) : (
            <EmptyTip />
          )}
        </ChartCard>

        {/* 卡片三：入睡时间折线图（仅月视图展示） */}
        {viewMode === 'month' && (
          <ChartCard title="本月入睡时间">
            {monthBedtimeByDay.size > 0 ? (
              <div ref={sleepRef} style={{ height: 300, width: '100%' }} />
            ) : (
              <EmptyTip />
            )}
          </ChartCard>
        )}
      </div>
    </div>
  );
}
