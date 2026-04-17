# con-oo-xieht27-sysu - Review

## Review 结论

当前实现已经尝试把 `Sudoku` / `Game` 接到真实界面里，但接入方式没有形成清晰的单一真相源，关键业务规则也没有稳定地收敛到领域对象中。结果是：从“开始新游戏”到普通输入这条链路看起来接上了，但 Notes、Hint、Undo/Redo 同步、Svelte store 边界和领域职责划分都存在明显缺口，整体只能算部分接入，尚未达到作业要求中较好的 OOP/OOD 与 Svelte 协作质量。

## 总体评价

| 维度 | 评价 |
| --- | --- |
| OOP | fair |
| JS Convention | fair |
| Sudoku Business | poor |
| OOD | poor |

## 缺点

### 1. 领域对象没有成为 UI 的唯一真相源

- 严重程度：core
- 位置：src/node_modules/@sudoku/stores/grid.js:46-105, src/components/Controls/Keyboard.svelte:24-35, src/components/Controls/ActionBar/Actions.svelte:23-50, src/components/Board/index.svelte:40-51
- 原因：真实渲染用的是 `$userGrid`，而 `domainGame` 只是并行维护的一份副本；组件在输入和撤销/重做后再手工把 domain 状态抄回 `userGrid`。这说明 View 并不是直接消费领域对象或其唯一导出的响应式视图，而是在维护两套状态并做人工同步，违背了作业要求中“真实界面真正通过领域对象完成主要流程”的核心目标，也使对象边界和状态一致性都很脆弱。

### 2. Svelte store 接口与调用方不一致

- 严重程度：core
- 位置：src/node_modules/@sudoku/stores/grid.js:79-105, src/components/Controls/Keyboard.svelte:30-33, src/components/Controls/ActionBar/Actions.svelte:28-35
- 原因：`createUserGrid()` 返回的对象只暴露了 `subscribe`、`set`、`applyHint`、`getGame`，并没有暴露 `update`；但 `Keyboard.svelte` 和 `Actions.svelte` 都直接调用了 `userGrid.update(...)`。仅从静态代码看，这是一处明显的接入断裂：关键交互路径依赖了不存在的 store API，说明这套 Svelte 接口没有收敛好，也削弱了“已接入真实流程”的可信度。

### 3. Notes 和 Hint 流程绕过了 Game/Sudoku

- 严重程度：core
- 位置：src/components/Controls/Keyboard.svelte:12-19, src/node_modules/@sudoku/stores/grid.js:89-95, src/components/Controls/ActionBar/Actions.svelte:13-20
- 原因：Notes 模式下直接 `userGrid.set(...)`，Hint 也只修改 `userGrid`，都没有进入 `Game` / `Sudoku`。这直接违反了“用户输入必须调用你的 Game / Sudoku 接口”的要求，也会让领域对象中的历史与界面状态脱节：Hint 和 Notes 造成的变化不会进入 undo/redo 历史，之后再执行撤销/重做时状态一致性没有保障。

### 4. Sudoku 没有承担起数独业务不变量和校验职责

- 严重程度：major
- 位置：src/domain/index.js:8-28
- 原因：`Sudoku` 只有一个可写 `grid` 和一个几乎无约束的 `guess(...)`；它不知道哪些格子是 givens，也没有暴露任何校验接口，甚至可以直接覆盖原始题面中的固定数字。数独最核心的业务规则被留在领域对象之外，导致 OOP 上缺少对象不变量，业务正确性只能依赖 UI 层额外防守，这不是稳健的领域建模。

### 5. 为 Svelte 准备的 adapter 没有成为真实接入层，业务规则还出现重复散落

- 严重程度：major
- 位置：src/domain/store-adapter.js:79-171, src/node_modules/@sudoku/stores/grid.js:110-154, src/node_modules/@sudoku/stores/game.js:7-20
- 原因：`src/domain/store-adapter.js` 已经实现了更接近作业推荐方案的 `createGameStore()`，但真实界面并没有围绕它工作，仍然沿用旧的 `grid` / `userGrid` / `invalidCells` / `gameWon` store 组合。同时，冲突检测和胜利判定逻辑分别存在于 adapter 和旧 store 中，说明领域边界与接入边界都不清晰，Svelte 架构上出现了重复逻辑和死代码。

### 6. Game 的序列化语义不完整

- 严重程度：major
- 位置：src/domain/index.js:168-195
- 原因：`toJSON()` 明确导出了 `past` 和 `future`，但 `createGameFromJSON()` 恢复时却直接丢弃历史，只保留当前 `sudoku`。这会让对象的外表化和反序列化不对称：一旦真正依赖 JSON 恢复游戏，undo/redo 历史会消失，属于 OOD 上接口语义不一致的问题。

### 7. Game 在不知道是否发生有效变更时就记录历史

- 严重程度：minor
- 位置：src/domain/index.js:115-122
- 原因：`Game.guess()` 先把当前 grid 压入 `past`，再调用 `Sudoku.guess()`；但 `Sudoku.guess()` 对无效输入只是静默返回，也不反馈是否真的改动了状态。这样会产生无意义历史项，把“命令是否成功”“状态是否变化”两个概念混在一起，既不利于业务表达，也会让 undo/redo 粒度变差。

## 优点

### 1. 领域对象有基本的封装和外表化意识

- 位置：src/domain/index.js:9-17, src/domain/index.js:34-46
- 原因：`createSudoku()` 会防御性复制输入，`getGrid()` / `toJSON()` 返回的也是拷贝，`clone()` 也明确提供了快照能力。这至少避免了外部直接持有内部数组引用，是比“裸二维数组到处传”更好的起点。

### 2. Undo / Redo 被收敛在 Game 对象中

- 位置：src/domain/index.js:98-145
- 原因：历史栈和 `undo()` / `redo()` 没有散落在 `.svelte` 组件里，而是集中在 `Game` 内部；新操作会清空 `future`，这个基本规则处理是正确的，也符合“把游戏操作入口集中到领域对象”的方向。

### 3. 开始新游戏的真实流程里确实创建了领域对象

- 位置：src/node_modules/@sudoku/game.js:13-34, src/node_modules/@sudoku/stores/grid.js:62-76
- 原因：无论是生成题目还是加载自定义题目，都会先更新题盘，再在 `grid.subscribe(...)` 中创建新的 `Sudoku` / `Game`。这说明领域对象并非只存在于测试里，而是已经被接到了真实启动流程上。

### 4. 视图层区分了题面 givens 和用户输入

- 位置：src/components/Board/index.svelte:40-51
- 原因：棋盘渲染同时参考原始 `grid` 和 `$userGrid`，并用 `userNumber={$grid[y][x] === 0}` 区分固定数字与用户填写数字。虽然底层状态设计仍有问题，但这个展示层意图是符合数独业务的。

## 补充说明

- 本次结论完全基于静态阅读；按要求没有运行 tests，也没有手动点击界面，因此所有关于接入是否会在运行期出错、Undo/Redo 与 Hint/Notes 是否脱节的判断，都是根据代码路径和接口一致性推导出来的。
- 审查范围限制在 `src/domain/*` 以及直接关联的 Svelte 接入代码，包括 `src/App.svelte`、`src/components/*`、`src/node_modules/@sudoku/game.js`、`src/node_modules/@sudoku/stores/grid.js`、`src/node_modules/@sudoku/stores/game.js`、`src/node_modules/@sudoku/stores/keyboard.js`。
- 如果作者原本想采用 `src/domain/store-adapter.js` 作为正式接入方案，那么当前代码库中它没有成为实际消费入口；这一点也是静态检索 import/调用链后得出的结论。
