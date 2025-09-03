import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  restrictToVerticalAxis,
  restrictToWindowEdges,
} from '@dnd-kit/modifiers';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { 
  Plus, 
  Calendar, 
  User, 
  GripVertical,
  Edit,
  Trash2,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Task Item Component
const TaskItem = ({ task, onEdit, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-card border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow ${
        isDragging ? 'rotate-3' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-start gap-2 flex-1">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-medium mb-1">{task.title}</h4>
            {task.description && (
              <p className="text-xs text-muted-foreground mb-2">{task.description}</p>
            )}
            
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                {task.priority || 'medium'}
              </Badge>
              
              {task.dueDate && (
                <Badge variant={isOverdue ? 'destructive' : 'outline'} className="text-xs">
                  <Calendar className="h-3 w-3 mr-1" />
                  {new Date(task.dueDate).toLocaleDateString()}
                </Badge>
              )}
              
              {task.assignedTo && (
                <Badge variant="outline" className="text-xs">
                  <User className="h-3 w-3 mr-1" />
                  {task.assignedTo.name}
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit(task)}
            className="h-6 w-6 p-0"
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(task.id)}
            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};

// Column Component
const KanbanColumn = ({ title, tasks, status, onAddTask, onEditTask, onDeleteTask }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  const getColumnColor = (status) => {
    const baseColors = {
      'ideas': 'border-blue-200 bg-blue-50/50',
      'in_progress': 'border-yellow-200 bg-yellow-50/50',
      'done': 'border-green-200 bg-green-50/50',
    };
    
    if (isOver) {
      return {
        'ideas': 'border-blue-400 bg-blue-100/70',
        'in_progress': 'border-yellow-400 bg-yellow-100/70',
        'done': 'border-green-400 bg-green-100/70',
      }[status] || 'border-gray-400 bg-gray-100/70';
    }
    
    return baseColors[status] || 'border-gray-200 bg-gray-50/50';
  };

  const getHeaderColor = (status) => {
    switch (status) {
      case 'ideas': return 'text-blue-700 bg-blue-100';
      case 'in_progress': return 'text-yellow-700 bg-yellow-100';
      case 'done': return 'text-green-700 bg-green-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  return (
    <div className={`rounded-lg border-2 transition-colors ${getColumnColor(status)}`}>
      <div className={`p-3 rounded-t-lg border-b ${getHeaderColor(status)}`}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{title}</h3>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {tasks.length}
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onAddTask(status)}
              className="h-6 w-6 p-0"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
      
      <div ref={setNodeRef} className="p-3 min-h-[300px]">
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
            />
          ))}
        </div>
        
        {tasks.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground mb-3">No tasks yet</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAddTask(status)}
              className="text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Task
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// Task Form Modal
const TaskFormModal = ({ isOpen, onClose, onSave, task, projectMembers }) => {
  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    priority: task?.priority || 'medium',
    dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
    assignedTo: task?.assignedTo?._id || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Task title is required');
      return;
    }

    const taskData = {
      ...formData,
      assignedTo: formData.assignedTo ? projectMembers.find(m => m._id === formData.assignedTo) : null,
      dueDate: formData.dueDate || null,
    };

    onSave(taskData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">
            {task ? 'Edit Task' : 'Create New Task'}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Task Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter task title"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter task description"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
              <select
                id="priority"
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                className="w-full p-2 border border-input rounded-md bg-background"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="assignedTo">Assign To</Label>
              <select
                id="assignedTo"
                value={formData.assignedTo}
                onChange={(e) => setFormData(prev => ({ ...prev, assignedTo: e.target.value }))}
                className="w-full p-2 border border-input rounded-md bg-background"
              >
                <option value="">Unassigned</option>
                {projectMembers.map((member) => (
                  <option key={member._id} value={member._id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                {task ? 'Update Task' : 'Create Task'}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

// Main Kanban Board Component
const KanbanBoard = ({ projectId, tasks = [], onTasksUpdate, projectMembers = [] }) => {
  const [localTasks, setLocalTasks] = useState(tasks);
  const [activeId, setActiveId] = useState(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [newTaskStatus, setNewTaskStatus] = useState('ideas');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const columns = [
    { id: 'ideas', title: 'Ideas / To Do', status: 'ideas' },
    { id: 'in_progress', title: 'In Progress', status: 'in_progress' },
    { id: 'done', title: 'Done', status: 'done' },
  ];

  const getTasksByStatus = (status) => {
    return localTasks.filter(task => task.status === status);
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeTask = localTasks.find(task => task.id === active.id);
    if (!activeTask) return;

    // Determine new status based on drop target
    let newStatus = activeTask.status;
    
    // If dropped on a column (droppable area)
    if (over.id === 'ideas' || over.id === 'in_progress' || over.id === 'done') {
      newStatus = over.id;
    } else {
      // If dropped on another task, get that task's status
      const overTask = localTasks.find(task => task.id === over.id);
      if (overTask) {
        newStatus = overTask.status;
      }
    }

    // Only update if status actually changed
    if (newStatus !== activeTask.status) {
      const updatedTasks = localTasks.map(task =>
        task.id === active.id ? { ...task, status: newStatus } : task
      );
      setLocalTasks(updatedTasks);
      onTasksUpdate(updatedTasks);
      
      const statusNames = {
        'ideas': 'Ideas',
        'in_progress': 'In Progress', 
        'done': 'Done'
      };
      toast.success(`Task moved to ${statusNames[newStatus]}`);
    }
  };

  const handleAddTask = (status) => {
    setNewTaskStatus(status);
    setEditingTask(null);
    setShowTaskForm(true);
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setShowTaskForm(true);
  };

  const handleSaveTask = (taskData) => {
    if (editingTask) {
      // Update existing task
      const updatedTasks = localTasks.map(task =>
        task.id === editingTask.id ? { ...task, ...taskData } : task
      );
      setLocalTasks(updatedTasks);
      onTasksUpdate(updatedTasks);
      toast.success('Task updated successfully');
    } else {
      // Create new task
      const newTask = {
        id: Date.now().toString(),
        ...taskData,
        status: newTaskStatus,
        createdAt: new Date().toISOString(),
      };
      const updatedTasks = [...localTasks, newTask];
      setLocalTasks(updatedTasks);
      onTasksUpdate(updatedTasks);
      toast.success('Task created successfully');
    }
  };

  const handleDeleteTask = (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      const updatedTasks = localTasks.filter(task => task.id !== taskId);
      setLocalTasks(updatedTasks);
      onTasksUpdate(updatedTasks);
      toast.success('Task deleted successfully');
    }
  };

  return (
    <div className="w-full h-full">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToWindowEdges]}
      >
        <SortableContext 
          items={localTasks.map(task => task.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4">
            {columns.map((column) => (
              <KanbanColumn
                key={column.id}
                title={column.title}
                status={column.status}
                tasks={getTasksByStatus(column.status)}
                onAddTask={handleAddTask}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeId ? (
            <TaskItem
              task={localTasks.find(task => task.id === activeId)}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <TaskFormModal
        isOpen={showTaskForm}
        onClose={() => setShowTaskForm(false)}
        onSave={handleSaveTask}
        task={editingTask}
        projectMembers={projectMembers}
      />
    </div>
  );
};

export default KanbanBoard;
