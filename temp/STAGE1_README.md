# AfaSense Frontend — 阶段一交付说明

## 文件结构

```
src/
├── index.css              # 全局 CSS 变量 + 基础样式（深色主题）
├── main.tsx               # 入口
├── App.tsx                # 路由配置
├── types/
│   └── index.ts           # TypeScript 类型定义
├── lib/
│   └── mockData.ts        # Mock 数据（开发阶段用）
├── hooks/
│   └── useApp.tsx         # 全局状态 Context（队伍切换）
└── components/
    ├── layout/
    │   ├── AppLayout.tsx  # 主布局（侧边栏 + 顶部栏 + 内容区）
    │   ├── Sidebar.tsx    # 左侧固定导航栏
    │   └── Topbar.tsx     # 顶部栏 + 队伍切换下拉
    ├── ui/
    │   └── BenchmarkBar.tsx  # Benchmark 色条组件（贯穿全产品）
    └── pages/
        ├── Dashboard.tsx  # 首页运动员卡片网格
        └── Placeholder.tsx   # 占位页（其他路由）
```

## 本地启动

```bash
cd frontend
npm install
npm run dev
```

## 接入真实 API

### 1. 替换 Mock 数据
编辑 `src/lib/mockData.ts` → 改为调用 FastAPI：

```ts
// 示例：替换 MOCK_ATHLETES
export async function fetchAthletes(teamId: number) {
  const res = await fetch(`/api/athletes?team_id=${teamId}`);
  return res.json();
}
```

### 2. 队伍切换器接入
编辑 `src/hooks/useApp.tsx` → 把 `MOCK_TEAMS` 改为 API 调用：

```ts
// useEffect(() => { fetch('/api/teams').then(...) }, []);
```

### 3. 后端需要的 API（阶段一）
| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/teams` | GET | 返回队伍列表 |
| `/api/athletes?team_id=1` | GET | 返回该队运动员列表 |
| `/api/athletes/:id` | GET | 返回单个运动员详情 |

## 已实现功能

- ✅ 全局深色主题 + CSS 变量系统（绿色 #22c55e 主色）
- ✅ 左侧固定导航栏（高亮当前页）
- ✅ 顶部队伍切换器（点击下拉，切换同步全局）
- ✅ Dashboard 运动员卡片网格（3-4 列自适应）
- ✅ 卡片：头像、姓名、位置、Readiness 环形图、Benchmark 色条、上次测试时间
- ✅ Alert 条（有需关注运动员时显示，可展开）
- ✅ 快速筛选：全部 / 需关注 / 良好
- ✅ Benchmark 色条组件（Weak/Fair/Average/Good/Excellent）
- ✅ 其他导航页占位（阶段二实现）

## 下一步（阶段二）

1. Athletes 列表页（卡片 → 搜索 + 筛选）
2. Athlete Profile（Overview / Performance / Bio Tab）
3. 接入 FastAPI 真实数据
