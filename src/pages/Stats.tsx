/**
 * Stats 数据统计页（飞书极简风 + 暗色适配）
 *
 * 1. 顶部「日 / 月 / 年」三段切换（海蓝选中）
 * 2. 番茄钟饼图：各任务专注时长占比（图例右侧，色块取固定「名家色板」按序循环分配）
 *    - 日视图：按具体任务（含子任务）统计
 *    - 月/年视图：仅按主任务统计，子任务时长沿 parentTaskId 链向上归并
 * 3. 年度专注热力图（竖排连续填充日历式）：每列 14 格从上到下连续排日期，横轴每 3 个月标记
 *    纯 div 网格渲染（相对 ECharts 可精确控制 w-3 h-3 / gap-[2px] 的格子尺寸与月份标签），
 *    悬停 tooltip 显示「日期 + 专注 N 分钟」，未来日期格子不渲染
 * 4. 入睡折线图（仅月视图）：y 轴 21:00 → 05:00 连续
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import * as echarts from 'echarts';
// 项目共享类型：Task（parentTaskId 为空表示主任务）、Tag、
// FocusSession（番茄钟专注记录，startedAt 为 ISO 字符串）、SleepRecord（date/bedtime）
import type { Task, Tag, FocusSession, SleepRecord } from '../types';

/* ==================== 常量与工具函数 ==================== */
/** 海蓝主题色（与全局强调色一致） */
const OCEAN_BLUE = '#3d7ea6';
/**
 * 名家色板：莫奈 / 梵高灵感的和谐低饱和色板。
 * 饼图不再使用标签色（标签色易冲突刺眼），改用此固定色板按序循环分配。
 */
const MASTER_PALETTE = [
  '#7B9E89', // 鼠尾草绿（莫奈睡莲）
  '#C3AED6', // 淡藤紫
  '#E8A87C', // 落日杏
  '#A8C5DA', // 天光蓝
  '#D4A373', // 麦秆棕
  '#9A8C98', // 灰紫
  '#B5C99A', // 嫩芽绿
  '#E5989B', // 桃粉
  '#84A59D', // 青灰绿
  '#F2CC8F', // 向日葵黄（梵高）
] as const;
/** 图表主文字色（图例等，明暗模式通用） */
const TEXT_PRIMARY = '#666';
/** 图表次级文字色（坐标轴等） */
const TEXT_SECONDARY = '#999';
/** 热力图星期标签：已移除（竖排连续填充式无纵轴文字） */
/**
 * 年度热力图 5 级颜色（0 分钟 = 最浅，最深为海蓝）。
 * 注：0 分钟档在暗色下改用深灰底（#232a30）以免整片浅色刺眼，数据档颜色严格不变。
 */
const HEAT_LEVELS = ['#eef4f8', '#cfe0ea', '#9dc0d4', '#5f94b8', '#3d7ea6'] as const;
// 0 分钟档的暗色替代色为 #232a30（写在类名里：bg-[#eef4f8] dark:bg-[#232a30]，Tailwind 需字面量）

/** 数字补零为两位字符串 */
const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Date → 'YYYY-MM-DD'（补零，与 date input 的取值格式一致） */
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

/** 通用图表卡片：标题（可选右侧附加信息）+ 内容区 */
function ChartCard({ title, extra, children }: { title: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{title}</h2>
        {extra /* 标题右侧附加信息（如年度总分钟数） */}
      </div>
      {children}
    </section>
  );
}

  /** 年度热力图单元格数据（未来日期 minutes=0，全年满格渲染） */
interface HeatCell {
  iso: string; // 'YYYY-MM-DD'
  minutes: number; // 当日专注总分钟
  weekday: number; // 预留字段（竖排日历式未使用）
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

  /** 饼图 / 折线图的 DOM 挂载点（年度热力图为纯 div 网格，无需 ECharts） */
  const pieRef = useRef<HTMLDivElement>(null);
  const sleepRef = useRef<HTMLDivElement>(null);
  /** 年度热力图整体容器（自定义 tooltip 以它为定位基准） */
  const heatWrapRef = useRef<HTMLDivElement>(null);
  /** 热力图自定义 tooltip 状态（x/y 为相对容器的坐标） */
  const [heatTip, setHeatTip] = useState<{ x: number; y: number; text: string } | null>(null);

  /** 时间基准（页面加载时刻），用于确定「今天 / 本月 / 今年」的统计范围 */
  const now = useMemo(() => new Date(), []);
  const todayStr = toISODate(now);
  const monthStr = toISOMonth(now);
  const yearStr = String(now.getFullYear());

  /** 任务索引表，便于按 id 查找 */
  const taskMap = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  /**
   * 归属主任务 id（带环保护）：
   * 1) 先沿 parentTaskId 子任务链上溯到顶
   * 2) 到顶后若该任务关联了主任务（masterTaskId），跳过去继续归并
   *    —— 保证"任务被关联/迁移时，历史专注时长跟着并入主任务"（SPEC F4 铁律）
   */
  const rootTaskIdOf = (taskId: string): string => {
    let current = taskMap.get(taskId);
    let rootId = taskId;
    const visited = new Set<string>([taskId]);
    while (current && current.parentTaskId && !visited.has(current.parentTaskId)) {
      visited.add(current.parentTaskId);
      rootId = current.parentTaskId;
      current = taskMap.get(current.parentTaskId);
    }
    const master = current?.masterTaskId;
    if (master && !visited.has(master)) {
      return rootTaskIdOf(master);
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
   * - 配色：抛弃标签色，改用名家色板按序循环分配（时长降序后依次取色）
   */
  const pieData = useMemo(() => {
    const minutesByTask = new Map<string, number>();
    for (const session of periodSessions) {
      const key = viewMode === 'day' ? session.taskId : rootTaskIdOf(session.taskId);
      minutesByTask.set(key, (minutesByTask.get(key) ?? 0) + session.minutes);
    }
    return Array.from(minutesByTask.entries())
      .sort((a, b) => b[1] - a[1]) // 按时长降序，图例更易读
      .map(([taskId, value], index) => {
        const task = taskMap.get(taskId);
        return {
          name: task?.title ?? '未知任务',
          value,
          itemStyle: { color: MASTER_PALETTE[index % MASTER_PALETTE.length] }, // 名家色板循环
        };
      });
  }, [periodSessions, viewMode, taskMap]);

  /* ---------- 2. 年度热力图数据（GitHub 贡献图样式） ---------- */
  /** 今年每天的专注总分钟数（startedAt 日期部分汇总） */
  const yearMinutesByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of focusSessions) {
      const day = s.startedAt.slice(0, 10);
      if (day.slice(0, 4) !== yearStr) continue; // 仅统计今年
      map.set(day, (map.get(day) ?? 0) + s.minutes);
    }
    return map;
  }, [focusSessions, yearStr]);

  /** 今年专注总分钟（卡片标题右侧展示 + 空数据判断） */
  const yearTotalMinutes = useMemo(
    () => Array.from(yearMinutesByDay.values()).reduce((sum, v) => sum + v, 0),
    [yearMinutesByDay]
  );

  /**
   * 年度热力图（竖排连续填充日历式）：
   * - 每列 14 格，从上到下连续排日期（第 1 列 = 1月1~14日，第 2 列从 1月15日 接续，全年约 27 列）；
   * - 横轴每 3 个月（1月/4月/7月/10月）在该月 1 号所在列上方标记；无纵轴文字；
   * - 未来日期保留槽位但不渲染（透明占位维持列对齐）。
   */
  const yearGrid = useMemo(() => {
    const year = now.getFullYear();
    const jan1 = new Date(year, 0, 1);
    const daysInYear = Math.round((new Date(year + 1, 0, 1).getTime() - jan1.getTime()) / 86400000); // 365/366

    const cells: Array<HeatCell> = []
    let maxMinutes = 0;
    for (let i = 0; i < daysInYear; i++) {
      const d = new Date(year, 0, 1 + i);
      const iso = toISODate(d);
      // 全年满格渲染：未来日期同样显示为「无记录」最浅色（参考图全年 26 列完整可见）
      const minutes = iso > todayStr ? 0 : (yearMinutesByDay.get(iso) ?? 0);
      maxMinutes = Math.max(maxMinutes, minutes);
      cells.push({ iso, minutes, weekday: 0 });
    }

    // 月份标签：只在 1/4/7/10 月的 1 号所在列（每 3 个月一个；全年满格所以全年都标）
    const monthLabels: Array<{ col: number; name: string }> = [];
    for (const m of [0, 3, 6, 9]) {
      const first = new Date(year, m, 1);
      const dayOfYear = Math.round((first.getTime() - jan1.getTime()) / 86400000);
      monthLabels.push({ col: Math.floor(dayOfYear / 14), name: `${m + 1}月` });
    }
    return { cells, cols: Math.ceil(daysInYear / 14), monthLabels, maxMinutes };
  }, [now, todayStr, yearMinutesByDay]);

  /**
   * 热力分级（0~4）：固定时长阈值（参考 GitHub 贡献图的经验分级）：
   * 0 = 无记录；1 = 1~30 分钟（最浅数据档）；2 = 31~60；3 = 61~120；4 = 120+ 分钟（最深）。
   * 不随全年最大值自适应——避免只记录 1 分钟时颜色直接顶格的不合理观感。
   */
  const levelOf = (minutes: number): number => {
    if (minutes <= 0) return 0;
    if (minutes <= 30) return 1;
    if (minutes <= 60) return 2;
    if (minutes <= 120) return 3;
    return 4;
  };

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

    /* ---------- 2. 年度专注热力图：纯 div 网格渲染（见下方 JSX），此处无需 ECharts ---------- */

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
  }, [viewMode, now, pieData, monthBedtimeByDay]);

  /** 三段切换选项 */
  const viewOptions: Array<{ key: 'day' | 'month' | 'year'; label: string }> = [
    { key: 'day', label: '日' },
    { key: 'month', label: '月' },
    { key: 'year', label: '年' },
  ];

  /** 热力图格子悬停：计算相对容器的坐标并显示自定义 tooltip（日期 + 专注分钟） */
  const showHeatTip = (e: React.MouseEvent<HTMLDivElement>, cell: HeatCell) => {
    const wrap = heatWrapRef.current;
    if (!wrap) return;
    const wrapRect = wrap.getBoundingClientRect();
    const cellRect = e.currentTarget.getBoundingClientRect();
      // 竖排日历式热力图：tooltip 显示「X月X日 专注 N 分钟」（不带周几）
      const m = cell.iso.slice(5, 7).replace(/^0/, '')
      const d = cell.iso.slice(8, 10).replace(/^0/, '')
      setHeatTip({
        x: cellRect.left - wrapRect.left + cellRect.width / 2, // 格子中心
        y: cellRect.top - wrapRect.top, // 格子上沿
        text: `${m}月${d}日 · 专注 ${cell.minutes} 分钟`,
      });
  };

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

        {/* 卡片二：年度专注热力图（GitHub 贡献图样式，标题右侧显示年度总分钟数） */}
        <ChartCard
          title={`${yearStr} 年专注热力图`}
          extra={
            <span className="text-xs text-neutral-400">
              年度专注 <b className="text-haruto-sea tabular-nums">{yearTotalMinutes}</b> 分钟
            </span>
          }
        >
          {yearTotalMinutes > 0 ? (
            <div className="overflow-x-auto pb-1">
              {/* 整体容器：tooltip 以它为定位基准 */}
              <div ref={heatWrapRef} className="relative w-fit min-w-full">
                {/* 月份标签行：每 3 个月标记一次（1月/4月/7月/10月），无纵轴文字 */}
                <div className="relative mb-1 h-4" style={{ width: yearGrid.cols * 14 - 2 }}>
                  {yearGrid.monthLabels.map(({ col, name }) => (
                    <span
                      key={name}
                      className="absolute top-0 whitespace-nowrap text-[10px] text-neutral-400"
                      style={{ left: col * 14 }} // 每列宽 12px + 间距 2px = 14px
                    >
                      {name}
                    </span>
                  ))}
                </div>

                {/* 主体：每列 14 格，从上到下连续填充日期（第 1 列 = 1月1~14 日，第 2 列从 1月15 日接续） */}
                <div className="flex gap-[2px]">
                  {Array.from({ length: yearGrid.cols }, (_, c) => (
                    <div key={c} className="flex flex-col gap-[2px]">
                      {yearGrid.cells.slice(c * 14, c * 14 + 14).map((cell) => (
                        <div
                          key={cell.iso}
                          onMouseEnter={(e) => showHeatTip(e, cell)}
                          onMouseLeave={() => setHeatTip(null)}
                          className={`w-3 h-3 rounded-[2px] transition-transform hover:scale-125 ${
                            cell.iso === todayStr ? 'ring-1 ring-haruto-sea ring-offset-0' : ''
                          } ${levelOf(cell.minutes) === 0 ? 'bg-[#eef4f8] dark:bg-[#232a30]' : ''}`}
                          style={
                            levelOf(cell.minutes) > 0
                              ? { backgroundColor: HEAT_LEVELS[levelOf(cell.minutes)] }
                              : undefined
                          }
                        />
                      ))}
                    </div>
                  ))}
                </div>

                {/* 图例（少 → 多）+ 年度摘要 */}
                <div className="mt-2 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1 text-[10px] text-neutral-400">
                    0
                    {HEAT_LEVELS.map((c, idx) => (
                      <span
                        key={c}
                        title={['无记录', '1~30分钟', '31~60分钟', '61~120分钟', '120分钟以上'][idx]}
                        className={`h-3 w-3 rounded-[2px] ${idx === 0 ? 'bg-[#eef4f8] dark:bg-[#232a30]' : ''}`}
                        style={idx > 0 ? { backgroundColor: c } : undefined}
                      />
                    ))}
                    2小时+
                  </div>
                  <div className="text-[10px] text-neutral-400">
                    已专注 {yearMinutesByDay.size} 天 · 共 {yearTotalMinutes} 分钟
                  </div>
                </div>

                {/* 自定义 tooltip：跟随格子位置，显示「日期 + 专注 N 分钟」 */}
                {heatTip && (
                  <div
                    className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-neutral-800 px-2 py-1 text-xs text-white shadow-lg dark:bg-neutral-700"
                    style={{ left: heatTip.x, top: heatTip.y - 4 }}
                  >
                    {heatTip.text}
                  </div>
                )}
              </div>
            </div>
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
