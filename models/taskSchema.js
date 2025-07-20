const { default: mongoose } = require('mongoose');

const Schema = require('mongoose').Schema;

const taskSchema = new Schema({
  taskName: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: false 
  },
  dueDate: {
    type: Date,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  } 
});

module.exports = mongoose.model('tasks', taskSchema);   
