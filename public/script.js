document.addEventListener('DOMContentLoaded', () => {
    const taskForm = document.getElementById('task-form');
    const taskTitleInput = document.getElementById('task-title-input');
    const activeTasksContainer = document.getElementById('active-tasks-container');
    const completedTasksContainer = document.getElementById('completed-tasks-container');
    const emptyState = document.getElementById('empty-state');
    const themeToggle = document.getElementById('theme-toggle');
    const logoutBtn = document.getElementById('logout-btn');

    const editModal = document.getElementById('edit-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const editForm = document.getElementById('edit-form');
    const editTaskIdInput = document.getElementById('edit-task-id');
    const editTitleInput = document.getElementById('edit-title');
    const editDescriptionInput = document.getElementById('edit-description');


    async function authFetch(url, options = {}) {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login.html';
            return Promise.reject('No token found');
        }

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers,
        };

        const response = await fetch(url, { ...options, headers });

        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            window.location.href = '/login.html';
            return Promise.reject('Unauthorized');
        }

        return response;
    }


    const fetchAndRenderTasks = async () => {
        try {
            const response = await authFetch('/api/tasks');
            if (!response.ok) throw new Error('Failed to fetch tasks');
            const tasks = await response.json();
            renderAllTasks(tasks);
        } catch (error) {
            if (error.message !== 'No token found' && error.message !== 'Unauthorized') {
                showToast('SYSTEM ERROR: Could not load tasks.', 'error');
            }
        }
    };

    const renderAllTasks = (tasks) => {
        activeTasksContainer.innerHTML = '';
        completedTasksContainer.innerHTML = '';

        const activeTasks = tasks.filter(task => !task.completed);
        const completedTasks = tasks.filter(task => task.completed);

        if (activeTasks.length === 0) {
            activeTasksContainer.appendChild(emptyState);
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
            activeTasks.forEach(task => activeTasksContainer.appendChild(createTaskCard(task)));
        }

        completedTasks.forEach(task => completedTasksContainer.appendChild(createCompletedTaskCard(task)));

        feather.replace();
    };

    const createTaskCard = (task) => {
        const card = document.createElement('div');
        card.className = 'task-card p-5 rounded-lg neon-border cursor-pointer';
        card.innerHTML = `
    <div class="flex justify-between items-start mb-3">
        <h3 class="text-xl font-bold neon-blue flex-1 pr-2">${task.text}</h3>
        <div class="flex space-x-2 flex-shrink-0">
            <button class="edit-btn text-green-400 hover:text-green-300" data-id="${task.id}" data-text="${task.text}" data-description="${task.description || ''}"><i data-feather="edit-2" class="w-4 h-4"></i></button>
            <button class="delete-btn text-red-400 hover:text-red-300" data-id="${task.id}"><i data-feather="trash-2" class="w-4 h-4"></i></button>
        </div>
    </div>
    <p class="text-gray-400 mb-4 h-10 overflow-hidden">${task.description || 'No additional briefing.'}</p>
    <div class="flex justify-between items-center">
        <span class="text-xs px-2 py-1 bg-purple-900/50 text-purple-300 rounded"></span>
        <button class="complete-btn text-xs neon-green" data-id="${task.id}">MARK AS COMPLETE</button>
    </div>
`;
        return card;
    };

    const createCompletedTaskCard = (task) => {
        const card = document.createElement('div');
        card.className = 'task-card p-5 rounded-lg border border-gray-800 bg-black/20 opacity-70';
        card.innerHTML = `
    <div class="flex justify-between items-start mb-3">
        <h3 class="text-xl font-bold text-gray-500 line-through">${task.text}</h3>
        <button class="delete-btn text-gray-500 hover:text-gray-400" data-id="${task.id}"><i data-feather="trash-2" class="w-4 h-4"></i></button>
    </div>
    <p class="text-gray-600 mb-4">${task.description || 'No additional briefing.'}</p>
    <div class="flex justify-between items-center">
        <span class="text-xs px-2 py-1 bg-gray-800/50 text-gray-500 rounded">ARCHIVED</span>
        <span class="text-xs text-gray-500">COMPLETED</span>
    </div>
`;
        return card;
    };

    taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = taskTitleInput.value.trim();
        if (!title) return;

        try {
            const response = await authFetch('/api/tasks', {
                method: 'POST',
                body: JSON.stringify({ text: title })
            });
            if (!response.ok) throw new Error('Failed to add task');
            taskTitleInput.value = '';
            showToast('New task protocol initiated.', 'success');
            fetchAndRenderTasks();
        } catch (error) {
            showToast('ERROR: Task protocol failed.', 'error');
        }
    });

    document.body.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.edit-btn');
        if (editBtn) {
            openEditModal(editBtn.dataset.id, editBtn.dataset.text, editBtn.dataset.description);
            return;
        }

        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) {
            try {
                const response = await authFetch(`/api/tasks/${deleteBtn.dataset.id}`, { method: 'DELETE' });
                if (!response.ok) throw new Error('Failed to delete task');
                showToast('Task log purged.', 'success');
                fetchAndRenderTasks();
            } catch (error) {
                showToast('ERROR: Purge command failed.', 'error');
            }
            return;
        }

        const completeBtn = e.target.closest('.complete-btn');
        if (completeBtn) {
            try {
                const response = await authFetch(`/api/tasks/${completeBtn.dataset.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ completed: true })
                });
                if (!response.ok) throw new Error('Failed to complete task');
                showToast('Task archived.', 'success');
                fetchAndRenderTasks();
            } catch (error) {
                showToast('ERROR: Archive command failed.', 'error');
            }
        }
    });

    const openEditModal = (id, text, description) => {
        editTaskIdInput.value = id;
        editTitleInput.value = text;
        editDescriptionInput.value = description;
        editModal.classList.remove('hidden');
    };

    const closeEditModal = () => {
        editModal.classList.add('hidden');
    };

    closeModalBtn.addEventListener('click', closeEditModal);
    cancelEditBtn.addEventListener('click', closeEditModal);

    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = editTaskIdInput.value;
        const updatedData = {
            text: editTitleInput.value.trim(),
            description: editDescriptionInput.value.trim()
        };

        try {
            const response = await authFetch(`/api/tasks/${id}`, {
                method: 'PATCH',
                body: JSON.stringify(updatedData)
            });
            if (!response.ok) throw new Error('Failed to save changes');
            showToast('Task parameters updated.', 'success');
            closeEditModal();
            fetchAndRenderTasks();
        } catch (error) {
            showToast('ERROR: Update failed.', 'error');
        }
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = '/login';
    });

    themeToggle.addEventListener('click', () => {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        const icon = themeToggle.querySelector('i');
        icon.setAttribute('data-feather', isDark ? 'sun' : 'moon');
        feather.replace();
    });

    const checkTheme = () => {
        if (localStorage.getItem('theme') === 'light') {
            document.documentElement.classList.remove('dark');
            themeToggle.querySelector('i').setAttribute('data-feather', 'moon');
        }
        feather.replace();
    };

    function showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        const color = type === 'success' ? 'green' : 'red';

        toast.className = `p-4 rounded-lg neon-border border-${color}-500 bg-black/80 backdrop-blur-sm text-white transition-all duration-300 toast-enter`;
        toast.innerHTML = `<p class="font-bold neon-${color}">${type === 'success' ? 'SUCCESS' : 'ERROR'}: <span class="text-gray-300 font-normal">${message}</span></p>`;

        toastContainer.appendChild(toast);

        setTimeout(() => toast.classList.remove('toast-enter'), 10);
        setTimeout(() => {
            toast.classList.add('toast-exit');
            toast.addEventListener('transitionend', () => toast.remove());
        }, 3000);
    }

    function init() {
        if (!localStorage.getItem('token')) {
            window.location.href = '/login.html';
            return;
        }
        checkTheme();
        fetchAndRenderTasks();
        feather.replace();
    }

    init();
});