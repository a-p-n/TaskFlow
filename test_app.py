import unittest
import json
import os
from flask_migrate import Migrate
from app import app, db
from models import Todo

class TestTodoAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # We don't need to call db.init_app(cls.app) here because
        # the db instance is already initialized in app.py.
        # This prevents the "SQLAlchemy instance has already been registered" error.
        cls.app = app
        cls.client = cls.app.test_client()

        # Use an in-memory Postgres database for testing to avoid
        # conflicts with the main database.
        cls.app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get("TEST_DATABASE_URI", 'postgresql://postgres:password@localhost:5432/test_todo_db')
        cls.app.config['TESTING'] = True

        # Bind the database and create tables
        with cls.app.app_context():
            db.create_all()

    @classmethod
    def tearDownClass(cls):
        # Clean up the database after all tests are done
        with cls.app.app_context():
            db.session.remove()
            db.drop_all()

    def setUp(self):
        self.app_context = self.__class__.app.app_context()
        # Clear the tasks table before each test
        with self.app.app_context():
            Todo.query.delete()
            db.session.commit()

    def test_add_task(self):
        # Test adding a new task
        response = self.client.post('/api/tasks', json = {'text': 'New Task'}, content_type='application/json')
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertEqual(data['text'], 'New Task')
        self.assertFalse(data['completed'])

    def test_get_tasks(self):
        # Test getting all tasks
        with self.app.app_context():
            db.session.add(Todo(text='Task 1'))
            db.session.add(Todo(text='Task 2'))
            db.session.commit()
        
        response = self.client.get('/api/tasks')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(len(data), 2)
        self.assertEqual(data[0]['text'], 'Task 2') # Check for descending order

    def test_update_task(self):
        # Test updating an existing task
        with self.app.app_context():
            task = Todo(text='Task to Update')
            db.session.add(task)
            db.session.commit()
            task_id = task.id

        response = self.client.patch(f'/api/tasks/{task_id}', data=json.dumps({'text': 'Updated Task', 'completed': True}), content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['text'], 'Updated Task')
        self.assertTrue(data['completed'])

    def test_delete_task(self):
        # Test deleting a task
        with self.app.app_context():
            task = Todo(text='Task to Delete')
            db.session.add(task)
            db.session.commit()
            task_id = task.id

        response = self.client.delete(f'/api/tasks/{task_id}')
        self.assertEqual(response.status_code, 204)
        
        with self.app.app_context():
            deleted_task = Todo.query.get(task_id)
            self.assertIsNone(deleted_task)

if __name__ == '__main__':
    unittest.main()
