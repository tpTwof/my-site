# tpTwo 前端

Vite + React + TypeScript + Tailwind + shadcn/ui。

```powershell
npm install
npm run dev
```

打开 http://localhost:5173 ，需要后端已在 8000 端口运行。

请求统一走 `src/lib/api.ts`，接口由 `vite.config.ts` 代理到后端。
项目整体说明见[根目录 README](../README.md)。

页面、动画播放规则、菜单、分类数量及黑白绿红配色以 [UI-SPEC](../docs/UI-SPEC.md) 为准。
首页交互实现按以下文件划分：

| 文件 | 职责 |
|---|---|
| `src/pages/HomePage.tsx`、`src/pages/home.css` | Welcome 开场、页面展开、首页排版 |
| `src/components/elastic-about-heading.tsx` | About me 句点拖动、字距拉伸与波浪回弹 |
| `src/components/journey-map.tsx`、`src/components/journey-map.css` | 固定介绍、日常记录管理、节点排版、图片与圆环效果 |
| `src/components/journey-route.tsx` | 鼠标沿线拖动、沿路返程、节点到达状态和终点渐变 |
| `src/lib/journey-route.ts` | 绘制、鼠标投影和动画共用的折线几何与路径距离 |
| `src/index.css` | 全站颜色变量 |

连线与移动圆点必须共用同一条折线路径；返程经过折角，不直接沿两点间的直线移动。
红色终点取实际最后一条记录，新增或删除记录时自动变化；颜色渐变覆盖倒数第二节点到最后节点的整段折线，返程反向过渡。

运行 `npm run build` 检查类型并构建，`npm run lint` 检查代码。

`docs/design/` 为设计参考资料，包含历史原稿，其示例颜色与布局不代表当前实现。
