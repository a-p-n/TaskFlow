document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');

    if (localStorage.getItem('token')) {
        window.location.href = '/tasks';
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMessage.classList.add('hidden');
        errorMessage.textContent = '';

        const username = loginForm.username.value;
        const password = loginForm.password.value;

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('token', data.access_token);
                window.location.href = '/tasks';
            } else {
                const errorData = await res.json();
                errorMessage.textContent = errorData.msg || 'Login failed. Please try again.';
                errorMessage.classList.remove('hidden');
            }
        } catch (error) {
            errorMessage.querySelector('span').textContent = 'An error occurred. Please check your connection.';
            errorMessage.classList.remove('hidden');
        }
    });
});
