## HW 问题收集

列举在HW 1、HW1.1过程里，你所遇到的2\~3个通过自己学习已经解决的问题，和2\~3个尚未解决的问题与挑战

### 已解决

1. 标量 derived store 的作用？
   1. **上下文**：Coding Agent 提示"允许保留少量标量 derived store，但不再生成板级 view model"
   2. **解决手段**：直接询问 CA + 查看 Svelte 文档理解 derived store 的派生逻辑

2. 如何将领域对象真正接入 Svelte 游戏流程？
   1. **上下文**：领域对象（Sudoku/Game）需要通过 store 或 adapter 暴露给 View 层
   2. **解决手段**：阅读现有 store 实现，理解订阅机制后完成接入

3. 如何理解 `invalidCells` 的派生逻辑？
   1. **上下文**：`src/node_modules/@sudoku/stores/grid.js` 中的 `invalidCells` derived store，遍历行/列/宫格检测冲突
   2. **解决手段**：手动推导一遍检测流程，梳理冲突标记的累积方式

### 未解决

1. `sameArea` 在高亮显示中的具体作用？
   1. **上下文**：`src/components/Board/index.svelte` 中的 `sameArea` 属性
   2. **尝试解决手段**：阅读代码逻辑，问 CA 未得到清晰解答

2. Sencode 编码格式的设计思路？
   1. **上下文**：`src/node_modules/@sudoku/sencode/index.js` 使用 Base62 + 位操作压缩 9x9 棋盘
   2. **尝试解决手段**：阅读编解码逻辑，但 `shouldReverse` 和结构/数字分离的设计意图不明确

3. candidates 存储结构的变更策略？
   1. **上下文**：`src/node_modules/@sudoku/stores/candidates.js` 中使用 `"x,y"` 字符串作为 key，值是候选数字数组
   2. **尝试解决手段**：阅读增删逻辑，但不确定在游戏过程中何时应该主动清理 candidates
