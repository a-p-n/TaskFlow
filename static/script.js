const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const taskList = document.getElementById('task-list');
const emptyState = document.getElementById('empty-state');
const taskCount = document.getElementById('task-count');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');
const themeToggle = document.getElementById('theme-toggle');
const editModal = document.getElementById('edit-modal');
const editTaskInput = document.getElementById('edit-task-input');
const closeModal = document.getElementById('close-modal');
const cancelEdit = document.getElementById('cancel-edit');
const saveEdit = document.getElementById('save-edit');
const filterAll = document.getElementById('filter-all');
const filterActive = document.getElementById('filter-active');
const filterCompleted = document.getElementById('filter-completed');

let tasks = [];
let currentFilter = 'all';
let currentEditId = null;

function init() {
    fetchTasks();
    setupEventListeners();
    checkThemePreference();
}


function setupEventListeners() {
    taskForm.addEventListener('submit', addTask);
    themeToggle.addEventListener('click', toggleTheme);
    closeModal.addEventListener('click', closeEditModal);
    cancelEdit.addEventListener('click', closeEditModal);
    saveEdit.addEventListener('click', saveEditedTask);
    filterAll.addEventListener('click', () => setFilter('all'));
    filterActive.addEventListener('click', () => setFilter('active'));
    filterCompleted.addEventListener('click', () => setFilter('completed'));
}

async function fetchTasks() {
    try{
        const res = await fetch("/api/tasks");
        const data = await res.json();
        tasks = data;
        renderTasks();
        updateTaskCount();
    } catch (error) {
        showToast('Failed to fetch tasks.', 'error');
        console.error('Error fetching tasks:', error);
    }
}

async function addTask(e) {
    e.preventDefault();
    if (taskInput.value.trim() === '') {
        showToast('Task cannot be empty!', 'error');
        return;
    }

    const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: taskInput.value.trim() })
    });
    const newTask = await res.json();
    tasks.unshift(newTask);
    renderTasks();
    updateTaskCount();
    taskInput.value = '';
    showToast('Task added successfully!');
}

async function deleteTask(id) {
    const res = await fetch(`/api/tasks/${id}`, {
        method: "DELETE"
    });

    if (res.ok) {
        tasks = tasks.filter(task => task.id !== id);
        renderTasks();
        updateTaskCount();
        showToast('Task deleted!');
    } else {
        showToast('Failed to delete task.', 'error');
    }
}


async function toggleComplete(id) {
    const task = tasks.find(task => task.id === id);
    if (!task) return;

    const updatedTask = { ...task, completed: !task.completed };

    const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: updatedTask.completed })
    });

    if (res.ok) {
        tasks = tasks.map(t => t.id === id ? updatedTask : t);
        renderTasks();
        updateTaskCount();
    } else {
        showToast('Failed to update task status.', 'error');
    }
}


function editTask(id) {
    const task = tasks.find(task => task.id === id);
    if (task) {
        currentEditId = id;
        editTaskInput.value = task.text;
        editModal.classList.remove('hidden');
        editTaskInput.focus();
    }
}

async function saveEditedTask() {
    const newText = editTaskInput.value.trim();
    if (newText === '') {
        showToast('Task cannot be empty!', 'error');
        return;
    }

    const res = await fetch(`/api/tasks/${currentEditId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newText })
    });

    if (res.ok) {
        tasks = tasks.map(task =>
            task.id === currentEditId ? { ...task, text: newText } : task
        );
        renderTasks();
        closeEditModal();
        showToast('Task updated successfully!');
    } else {
        showToast('Failed to update task.', 'error');
    }
}


function closeEditModal() {
    editModal.classList.add('hidden');
    currentEditId = null;
}

function setFilter(filter) {
    currentFilter = filter;

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('bg-indigo-600', 'text-white');
        btn.classList.add('bg-gray-200', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-200');
    });

    const activeBtn = document.getElementById(`filter-${filter}`);
    activeBtn.classList.add('bg-indigo-600', 'text-white');
    activeBtn.classList.remove('bg-gray-200', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-200');

    renderTasks();
}

function getFilteredTasks() {
    switch (currentFilter) {
        case 'active': return tasks.filter(task => !task.completed);
        case 'completed': return tasks.filter(task => task.completed);
        default: return tasks;
    }
}

function renderTasks() {
    const filteredTasks = getFilteredTasks();

    if (filteredTasks.length === 0) {
        if (currentFilter === 'all') {
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
            taskList.innerHTML = `
                <div class="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
                    <i class="fas fa-filter text-4xl text-gray-300 dark:text-gray-600 mb-4"></i>
                    <h3 class="text-lg font-medium text-gray-500 dark:text-gray-400">No ${currentFilter} tasks</h3>
                    <p class="text-gray-400 dark:text-gray-500">Try changing your filter or add a new task.</p>
                </div>
            `;
        }
        return;
    }

    emptyState.classList.add('hidden');
    taskList.innerHTML = filteredTasks
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map(task => `
            <div class="task-item bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center justify-between gap-3 fade-in">
                <div class="flex items-center gap-3 flex-grow">
                    <button onclick="toggleComplete(${task.id})"
                        class="w-6 h-6 rounded-full border-2 ${task.completed ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300 dark:border-gray-600'} flex items-center justify-center transition-colors">
                        ${task.completed ? '<i class="fas fa-check text-white text-xs"></i>' : ''}
                    </button>
                    <span class="${task.completed ? 'completed-task' : ''} flex-grow dark:text-white">${task.text}</span>
                </div>
                <div class="flex gap-2">
                    <button onclick="editTask(${task.id})" class="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 transition-colors">
                        <i class="fas fa-edit text-sm"></i>
                    </button>
                    <button onclick="deleteTask(${task.id})" class="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 transition-colors">
                        <i class="fas fa-trash-alt text-sm"></i>
                    </button>
                </div>
            </div>
        `).join('');
}

function updateTaskCount() {
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const active = total - completed;
    taskCount.textContent = `${active} active, ${completed} completed (${total} total)`;
}

function showToast(message, type = 'success') {
    toastMessage.textContent = message;
    const toastElement = toast.querySelector('.toast');
    toastElement.className = 'toast px-4 py-2 rounded-lg shadow-lg flex items-center gap-2';

    if (type === 'error') {
        toastElement.classList.add('bg-red-500', 'text-white');
    } else {
        toastElement.classList.add('bg-green-500', 'text-white');
    }

    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

function checkThemePreference() {
    if (localStorage.getItem('theme') === 'dark' ||
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}

function toggleTheme() {
    if (document.documentElement.classList.contains('dark')) {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    }
}

init();

window.toggleComplete = toggleComplete;
window.editTask = editTask;
window.deleteTask = deleteTask;
