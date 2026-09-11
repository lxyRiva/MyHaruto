【版本=v5.2｜取代=v4｜生效=是｜其他版本一律作废】
【本卡=RF-B1 收尾阶段 2 补交执行卡（全文）】
【改动=相对 v4 补验收标准第 10 条（countOf 口径）+todayRoots 补注】
【状态】施工中 · 2026-09-11 · commit=待定（WIP 17 项）· 证据=补交报告两段制待交

你是 MyHaruto 的【开发会话】，执行 RF-B1 收尾阶段 2 交付补交 v5.2
（v1.51 批复修正后定稿——取代 v4 卡；v4 丢验收标准第 10 条与
todayRoots 补注，本卡补回，其余与 v4 一字不差）。
已读文件不重复读。第一句话先执行：读 docs/AGENT_STATE.md，告诉我
当前状态和你该干什么。

第零步（硬性·清场细则）：
1. 按端口清 vite 孤儿：netstat -ano | findstr :5173 → 对 PID 优雅关闭；
   不依赖 concurrently -k（Windows 下杀不掉孙进程，历史坑）
2. electron 优雅退出：alt+F4 / WM_CLOSE（CloseMainWindow），禁 taskkill
3. 复验：5173 无 LISTENING、tasklist 无 electron → 清场完成

一、开工锁（hash/行号/文件数一律现场实测，本卡所列为快照仅参考）：
   pwd；git log --oneline -1 贴输出（快照=51f78f0，以实测为准）；
   git status --short 全贴（快照=17 项：16M+groupPosition.ts，
   以实测为准）；node_modules 存在。

二、施工前反问（§10 新规；答案格式=消费点清单[文件:行号]+逐点核对
   结论，禁抄本卡预期）：
   本阶段语义全消费面=groupPosition（Today.tsx:52/Tasks.tsx:45 两页）
   + taskMenu 置顶该组（TaskCard.tsx:105/ListTaskCard.tsx:181 两链）。
   逐点核对后开工；发现卡漏立即上报。

三、阶段 2 主施工【核对在位】（已实点通过，本阶段只核对未被覆盖；
   若发现被覆盖则重做并报告）：
   1. groupPosition 方案甲严格版：positionDateOf 纯位置日期
      （父参与+未完成后代参与+已完成跳过；Today/Tasks 消费迁移）
   2. A1 连带 7 项：置顶该组写直接父+横板不读+children 各就各位+
      守卫收口
   3. A4 三层独立逻辑（区块归属/组间排序/组内排序禁合并）
   4. A2/A3 修复：BoardColumn「＋ 新建分组」+紧凑变体「创建」按钮

四、补交一：countOf 口径落码（口径甲已拍板；**结构性要求·最核心**）：
   countOf('today') 必须复用 Today 页今天区分组结果——共用同一
   selector/消费点，禁独立再算 groupPosition。
- 实现：useTaskSelectors 新增 todayRoots useMemo（组位置=today 的
  根任务集[**不含折叠区已完成根卡**]，调 positionDateOf；today 进
  useMemo 依赖数组与否，报告明说——跨零点重算依赖此）
- countOf('today')=todayRoots.length（**组卡数，每父卡计 1**）
  ——**唯一口径，禁止第二定义**
- 折叠判定写死（foldedOf 语义明文）：折叠区成员=根任务 done 且
  root.aggregated（DoneFoldSection 聚合成员，整组进折叠区）；
  **子任务自己 done、父任务未聚合 → 不算折叠，仍计入**
  （口径含已完成：点进去看到几个就数几个）
- tooltip（N/M 明文）：「今天 N 个任务（含子任务 M 条）」
  ——N=countOf('today')（组卡数）；M=今天区全部后代任务数（含已完成）
- L2Sidebar「今天」数字旁加 tooltip（title 属性实时值）
- 附带清点：grep countOf 其他分支（'all'/tagId）旧 isPinnedToday
  残留——**先列报告，不擅自改**（口径未定本轮不扩范围）
- todayRoots 依赖链报告三项（必答）：①today 来源（new Date() 现算/
  state/props）②today 是否进 useMemo 依赖数组 ③跨零点时 L2 与
  Today 页是否同步刷新

任务 2：ListTaskCard.tsx:8 死 import 删
- import { pinnedGroupFirst, taskSort } 中 pinnedGroupFirst 已无消费
  （children 已是纯 sort(taskSort)），改为
  import { taskSort } from '../utils/taskSort'
- 删后 npx tsc --noEmit 确认零错误（若报 unused 相关反而说明删对了）

任务 3：v1.32 八条验收对照表（随补交报告交用户，**两态格式禁混用**）：
- 已实点条目（置顶该组①-⑤/置顶今天①②）→「复验步骤」（用户走一遍
  与开发证据一致即过）
- 未实点条目（置顶今天③守卫）→「首次手测步骤」（操作路径 A→B→C
  看到 X 算过）
- 表列：条目|实点状态|证据索引|手测步骤|通过标准|反例；未完成清单
  （四场景机械+双链 8 点）一并入表
- **逐点通过标准（卡面预定义，开发照此填实测结果）**：
  * 四场景：未来=整组显示于未来日期区块且组内升序｜今天=整组在
    今天区｜逾期=全部成员逾期才整组入区（红字链）｜混合（父逾期+
    子未逾期）=组位于子最近未过期日期、父卡红字
  * 双链 8 点：置顶=置顶该组后该组/子卡浮首且横板顺序不变｜
    日期编辑=DatePickerModal 保存后 dueDate+remindAt 落库且组位置
    随新日期重算｜番茄发起=startPomo 落库+minutesOf 递归累加
    （父=自身+子孙）｜检查事项=勾选/添加/编辑/删除落库+默认模式
    随内容｜子任务折叠=折叠展开正确+子孙跟随父卡分区｜优先级设置=
    四旗写入+勾选框变色+taskSort 随之｜删除=确认框+deleteTaskTree
    整树｜右键菜单=父子入口置顶该组 target=直接父、九项齐全

八、UI 实点时间窗协商方式（v1.50 第四条，二选一）：
1. 用户指定时段：你在交付报告中列可选时段（如"工作日 20:00-22:00/周末全天"），用户挑一个确认
2. 开发申请时段：开发在报告中申请具体时段（写明预计实点耗时），用户确认后占用

禁止：默认"用户在用就转手测"（上一轮教训：实点验证不可转嫁）。
本卡 UI 实点=阶段 2 交付的核心验收内容，必须开发亲测。

九、交付报告（四项制）+ 施工前反问答案 + 连带清单 7 项逐项落点 +
   验收截图/录屏索引 + **A2/A3 核对结果说明**。停手不 commit。
十、冲突停手回报规划层。工作区边界 §11 生效。
