document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const errorMessage = document.getElementById('error-message');

    if (localStorage.getItem('token')) {
        window.location.href = '/tasks';
    }

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMessage.classList.add('hidden');

        const username = registerForm.username.value;
        const password = registerForm.password.value;

        try {
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (res.status === 201) {
                window.location.href = '/login';
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

