import os
from flask import Flask, jsonify, request, render_template
from flask_cors import CORS
from flask_migrate import Migrate
from models import db, Todo
from config import Config

app = Flask(__name__)
app.config.from_object(Config)

CORS(app)
db.init_app(app)
migrate = Migrate(app, db)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    tasks = Todo.query.order_by(Todo.created_at.desc()).all()
    return jsonify([t.to_dict() for t in tasks])

@app.route('/api/tasks', methods=['POST'])
def add_task():
    data = request.get_json()
    text = data.get('text')

    if not text:
        return jsonify({"error": "Task text required"}), 400

    new_task = Todo(text=text)
    db.session.add(new_task)
    db.session.commit()

    return jsonify(new_task.to_dict()), 201
@app.route('/api/tasks/<int:task_id>', methods=['PATCH'])
def update_task(task_id):
    data = request.get_json()
    task = Todo.query.get_or_404(task_id)

    if 'text' in data:
        task.text = data['text']
    if 'completed' in data:
        task.completed = data['completed']

    db.session.commit()
    return jsonify(task.to_dict())
@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    task = Todo.query.get_or_404(task_id)
    db.session.delete(task)
    db.session.commit()

    return jsonify({}), 204
if __name__ == '__main__':
    app.run(debug=True)
