import unittest
import requests
import os
from unittest.mock import patch, MagicMock
from app import app
from models import db, Todo
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# We need a test database URI to prevent tests from affecting the production database
TEST_DATABASE_URI = os.getenv("TEST_DATABASE_URI", "postgresql://user:password@localhost/test_db")

class TestTodoAPI(unittest.TestCase):
    """
    Unit tests for the Flask Todo API.
    """
    @classmethod
    def setUpClass(cls):
        """
        Set up the test environment. This runs once for the entire test class.
        """
        # Patch the database URI to use the test database
        cls.patcher = patch('config.Config.SQLALCHEMY_DATABASE_URI', TEST_DATABASE_URI)
        cls.patcher.start()
        
        # Re-initialize the app with the test database URI
        cls.app = app
        cls.app.config.from_object('config.Config')
        with cls.app.app_context():
            db.init_app(cls.app)
            # Create a test client for making requests
            cls.client = cls.app.test_client()

            # Create the database tables
            db.create_all()

    @classmethod
    def tearDownClass(cls):
        """
        Clean up the test environment. This runs once after all tests are done.
        """
        with cls.app.app_context():
            # Drop all database tables to clean up the test environment
            db.drop_all()
        # Stop the patcher to revert the original database URI
        cls.patcher.stop()

    def setUp(self):
        """
        Set up before each test. This runs before every test method.
        """
        with self.app.app_context():
            # Clear all existing data from the todos table before each test
            Todo.query.delete()
            db.session.commit()

    def test_add_task(self):
        """
        Test adding a new task via a POST request.
        """
        response = self.client.post('/api/tasks', json={'text': 'Test task'})
        self.assertEqual(response.status_code, 201)
        data = response.get_json()
        self.assertIn('text', data)
        self.assertEqual(data['text'], 'Test task')

    def test_get_tasks(self):
        """
        Test retrieving all tasks via a GET request.
        """
        with self.app.app_context():
            db.session.add(Todo(text="First task"))
            db.session.add(Todo(text="Second task"))
            db.session.commit()
        
        response = self.client.get('/api/tasks')
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(len(data), 2)
        self.assertEqual(data[0]['text'], "Second task") # Assumes ordering by creation date descending

    def test_update_task(self):
        """
        Test updating a task's text and completion status.
        """
        with self.app.app_context():
            new_task = Todo(text="Task to update")
            db.session.add(new_task)
            db.session.commit()
            task_id = new_task.id
        
        # Update the task text
        response = self.client.patch(f'/api/tasks/{task_id}', json={'text': 'Updated task'})
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data['text'], 'Updated task')
        
        # Update the completion status
        response = self.client.patch(f'/api/tasks/{task_id}', json={'completed': True})
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data['completed'])

    def test_delete_task(self):
        """
        Test deleting a task.
        """
        with self.app.app_context():
            new_task = Todo(text="Task to delete")
            db.session.add(new_task)
            db.session.commit()
            task_id = new_task.id
        
        response = self.client.delete(f'/api/tasks/{task_id}')
        self.assertEqual(response.status_code, 204)
        
        # Verify the task is gone
        with self.app.app_context():
            task = Todo.query.get(task_id)
            self.assertIsNone(task)

if __name__ == '__main__':
    unittest.main()
