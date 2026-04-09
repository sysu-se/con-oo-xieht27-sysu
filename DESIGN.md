# Homework 1.1 Design Document

## A. 领域对象如何被消费

### 1. View 层直接消费的是什么？

View 层通过 **Svelte Store** 消费领域对象，具体来说是消费 `userGrid` store 中封装的 domain Game 实例。

**核心架构：**
- `src/node_modules/@sudoku/stores/grid.js` 中的 `userGrid` store
- 当 `grid` store 变化时（新的数独开始），会自动创建新的 domain `Game` 实例
- `userGrid.getGame()` 方法暴露 domain Game 供组件调用

### 2. View 层拿到的数据是什么？

| 数据 | 来源 | 说明 |
|------|------|------|
| `grid` | `userGrid` store 的响应式状态 | 9x9 数字网格 |
| `invalidCells` | `invalidCells` derived store | 冲突单元格数组 |
| `gameWon` | `gameWon` derived store | 游戏是否胜利 |
| `selectedCell` | `cursor` store | 当前选中的单元格 |

### 3. 用户操作如何进入领域对象？

**用户输入流程：**

```
用户点击键盘/按键
    ↓
Keyboard.svelte: handleKeyButton(num)
    ↓
userGrid.getGame().guess({ row, col, value })
    ↓
Domain Game 记录历史
    ↓
同步状态回 userGrid store
    ↓
Svelte 自动触发响应式更新
```

**Undo/Redo 流程：**

```
用户点击 Undo/Redo 按钮
    ↓
Actions.svelte: handleUndo()/handleRedo()
    ↓
userGrid.getGame().undo()/redo()
    ↓
Domain Game 恢复状态
    ↓
同步到 userGrid store → 触发 UI 更新
```

### 4. 领域对象变化后，Svelte 为什么会更新？

**关键机制：Svelte Store 的订阅-发布模式**

```
Domain Game (内部状态)
    ↓ (直接修改)
userGrid store (writable)
    ↓ (自动通知)
所有订阅 $userGrid 的组件自动更新
```

当 `userGrid.update()` 被调用时，Svelte 自动通知所有订阅该 store 的组件重新渲染。

---

## B. 响应式机制说明

### 1. 我依赖的是什么机制？

本方案依赖 **Svelte Custom Store** 机制：

- **`writable` store**: 可写的响应式状态容器
- **`derived` store**: 从其他 store 派生的响应式计算
- **Store 订阅**: 通过 `$store` 语法自动订阅变化

### 2. 哪些数据是响应式暴露给 UI 的？

```javascript
// grid.js 中的响应式暴露
const userGrid = writable([...]);  // 可写 store，UI 直接消费
const invalidCells = derived(userGrid, ...);  // 派生 store
const gameWon = derived([userGrid, invalidCells], ...);  // 多源派生
```

### 3. 哪些状态留在领域对象内部？

```javascript
// Domain Game 内部状态（不直接暴露）
let currentSudoku;  // 当前数独实例
const past = [];     // 历史状态栈（undo 用）
const future = [];  // 未来状态栈（redo 用）
```

### 4. 如果不用我的方案，而是直接 mutate 内部对象，会出现什么问题？

**问题场景：**

如果 UI 直接修改 `userGrid` 数组元素而不通过 `userGrid.update()`:

```javascript
// 错误做法
$userGrid[row][col] = value;  // 直接修改，不会触发响应式更新！
```

**会出现的问题：**

1. **UI 不更新**: Svelte 无法检测到数组内部的变化，因为 Svelte 的响应式是基于赋值的，不是基于引用的

2. **历史记录丢失**: 用户操作没有经过 domain Game 的 `guess()` 方法，undo/redo 栈不会被更新

3. **状态不一致**: domain Game 内部状态和 UI 显示的状态会逐渐失去同步

**为什么我的方案能工作：**

```javascript
// 正确做法：通过 update() 方法
userGrid.update($userGrid => {
    $userGrid[row][col] = value;  // 仍然修改数组
    return $userGrid;             // 但返回整个数组，触发重新赋值
});
```

Svelte 的响应式跟踪的是 `userGrid` 这个 store 变量本身，而不是它内部的数组。当调用 `update()` 返回新值时，Svelte 会标记该 store 为已更新，触发所有订阅者重新渲染。

---

## C. 改进说明

### 1. 相比 Homework 1，我改进了什么？

| HW1 问题 | HW1.1 改进 |
|----------|------------|
| 领域对象只存在于测试中 | 领域对象真正接入 Svelte 游戏流程 |
| UI 直接操作 `userGrid.set()` | UI 通过 domain Game 的 `guess()` 方法操作 |
| Undo/Redo 功能未接入 | Undo/Redo 按钮调用 domain Game 方法 |
| 响应式机制不清楚 | 通过 store 适配层暴露响应式状态 |

### 2. 为什么 HW1 中的做法不足以支撑真实接入？

HW1 的实现存在以下问题：

1. **领域对象与 UI 隔离**: Domain Game 只在测试中可用，真实游戏流程完全不经过领域对象

2. **缺乏响应式桥接**: 即使创建了 domain Game，Svelte 组件也不知道如何响应其状态变化

3. **历史管理断裂**: Undo/Redo 按钮存在但功能未实现，因为 UI 没有调用 domain Game 的方法

### 3. 我的新设计有哪些 trade-off？

**优点：**
- 领域对象成为游戏状态的唯一真实来源
- Undo/Redo 功能完整实现
- 保持了与现有 store 的兼容性（渐进式改进）

**缺点：**
- `userGrid` store 同时管理原始数据（puzzle）和用户输入，职责不够单一
- domain Game 和 userGrid 之间需要手动同步状态
- 初始化时通过 `grid.subscribe()` 隐式创建 domain Game，流程不够显式

**改进方向：**
- 可以进一步将 domain Game 提升为顶层 store，显式管理整个游戏生命周期
- 可以将 `userGrid` 完全重构为只读展示层，所有写入都经过 domain Game
