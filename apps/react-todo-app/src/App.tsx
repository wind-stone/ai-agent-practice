import { useState, useEffect, useCallback } from 'react'
import './App.css'

interface Todo {
  id: number
  text: string
  completed: boolean
  createdAt: number
}

type FilterType = 'all' | 'active' | 'completed'

function App() {
  const [todos, setTodos] = useState<Todo[]>(() => {
    const saved = localStorage.getItem('react-todos')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return []
      }
    }
    return []
  })
  const [inputValue, setInputValue] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  // 持久化到 localStorage
  useEffect(() => {
    localStorage.setItem('react-todos', JSON.stringify(todos))
  }, [todos])

  // 添加待办事项
  const addTodo = useCallback(() => {
    const trimmed = inputValue.trim()
    if (!trimmed) return

    setIsAdding(true)
    const newTodo: Todo = {
      id: Date.now(),
      text: trimmed,
      completed: false,
      createdAt: Date.now(),
    }
    setTodos(prev => [newTodo, ...prev])
    setInputValue('')

    // 延迟移除动画类
    setTimeout(() => setIsAdding(false), 300)
  }, [inputValue])

  // 删除待办事项
  const deleteTodo = useCallback((id: number) => {
    setTodos(prev => prev.map(todo =>
      todo.id === id ? { ...todo, completed: true } : todo
    ))
    // 延迟真正删除，让动画播放
    setTimeout(() => {
      setTodos(prev => prev.filter(todo => todo.id !== id))
    }, 300)
  }, [])

  // 切换完成状态
  const toggleTodo = useCallback((id: number) => {
    setTodos(prev => prev.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ))
  }, [])

  // 开始编辑
  const startEdit = useCallback((todo: Todo) => {
    setEditingId(todo.id)
    setEditText(todo.text)
  }, [])

  // 保存编辑
  const saveEdit = useCallback((id: number) => {
    const trimmed = editText.trim()
    if (!trimmed) {
      deleteTodo(id)
      return
    }
    setTodos(prev => prev.map(todo =>
      todo.id === id ? { ...todo, text: trimmed } : todo
    ))
    setEditingId(null)
    setEditText('')
  }, [editText, deleteTodo])

  // 取消编辑
  const cancelEdit = useCallback(() => {
    setEditingId(null)
    setEditText('')
  }, [])

  // 键盘事件处理
  const handleKeyDown = useCallback((e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      action()
    }
  }, [])

  // 过滤后的待办事项
  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') return !todo.completed
    if (filter === 'completed') return todo.completed
    return true
  })

  // 统计信息
  const totalCount = todos.length
  const activeCount = todos.filter(t => !t.completed).length
  const completedCount = todos.filter(t => t.completed).length

  return (
    <div className="app-container">
      <div className="todo-app">
        <header className="app-header">
          <h1>📋 Todo List</h1>
          <p className="subtitle">管理你的日常任务</p>
        </header>

        {/* 添加待办 */}
        <div className="input-section">
          <div className="input-wrapper">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, addTodo)}
              placeholder="输入新的待办事项..."
              className="todo-input"
              maxLength={200}
            />
            <button
              onClick={addTodo}
              className="add-btn"
              disabled={!inputValue.trim()}
            >
              <span className="btn-icon">+</span>
              添加
            </button>
          </div>
        </div>

        {/* 筛选和统计 */}
        <div className="toolbar">
          <div className="filter-group">
            {(['all', 'active', 'completed'] as FilterType[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`filter-btn ${filter === f ? 'active' : ''}`}
              >
                {f === 'all' ? '全部' : f === 'active' ? '进行中' : '已完成'}
              </button>
            ))}
          </div>
          <div className="stats">
            <span className="stat-item">
              <span className="stat-num">{totalCount}</span> 总计
            </span>
            <span className="stat-item active-stat">
              <span className="stat-num">{activeCount}</span> 进行中
            </span>
            <span className="stat-item completed-stat">
              <span className="stat-num">{completedCount}</span> 已完成
            </span>
          </div>
        </div>

        {/* 待办列表 */}
        <div className="todo-list">
          {filteredTodos.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📝</div>
              <p>
                {filter === 'all'
                  ? '还没有待办事项，添加一个吧！'
                  : filter === 'active'
                  ? '没有进行中的任务'
                  : '没有已完成的任务'}
              </p>
            </div>
          ) : (
            filteredTodos.map((todo, index) => (
              <div
                key={todo.id}
                className={`todo-item ${todo.completed ? 'completed' : ''} ${isAdding && index === 0 ? 'slide-in' : ''}`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <label className="checkbox-wrapper">
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => toggleTodo(todo.id)}
                    className="todo-checkbox"
                  />
                  <span className="checkmark"></span>
                </label>

                {editingId === todo.id ? (
                  <div className="edit-wrapper">
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit(todo.id)
                        if (e.key === 'Escape') cancelEdit()
                      }}
                      className="edit-input"
                      autoFocus
                      maxLength={200}
                    />
                    <div className="edit-actions">
                      <button
                        onClick={() => saveEdit(todo.id)}
                        className="save-btn"
                        title="保存"
                      >
                        ✓
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="cancel-btn"
                        title="取消"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span
                      className={`todo-text ${todo.completed ? 'completed-text' : ''}`}
                      onDoubleClick={() => !todo.completed && startEdit(todo)}
                      title="双击编辑"
                    >
                      {todo.text}
                    </span>
                    <div className="todo-actions">
                      {!todo.completed && (
                        <button
                          onClick={() => startEdit(todo)}
                          className="edit-btn"
                          title="编辑"
                        >
                          ✏️
                        </button>
                      )}
                      <button
                        onClick={() => deleteTodo(todo.id)}
                        className="delete-btn"
                        title="删除"
                      >
                        🗑️
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        {/* 底部操作 */}
        {todos.length > 0 && (
          <div className="footer-actions">
            <span className="footer-text">
              已完成 {completedCount}/{totalCount} 项
            </span>
            {completedCount > 0 && (
              <button
                onClick={() => setTodos(prev => prev.filter(t => !t.completed))}
                className="clear-btn"
              >
                清除已完成
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
