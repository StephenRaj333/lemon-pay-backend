const express = require("express");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const redis = require("redis");
const userSchema = require("../models/userSchema");
const taskSchema = require("../models/taskSchema");
const router = express.Router();
dotenv.config();

// Redis client setup
const redisClient = redis.createClient({
  url: process.env.REDIS_URL
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error', err);
});

// Connect to Redis
(async () => {
  try {
    await redisClient.connect();
    console.log('✅ Redis connected for caching');
    
    // Redundant LRU Code  
    { /* Configure LRU eviction policy 
    await redisClient.configSet('maxmemory-policy', 'allkeys-lru');     
    await redisClient.configSet('maxmemory', '100mb'); 
    console.log('✅ Redis LRU policy configured');
    */}
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
  }
})();  

// Cache helper functions
const getCacheKey = (userId, taskId = null) => {
  return taskId ? `user:${userId}:task:${taskId}` : `user:${userId}:tasks`;
};

const invalidateUserCache = async (userId) => {
  try {
    const pattern = `user:${userId}:*`;
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (error) {
    console.error('Cache invalidation error:', error);
  }
};

// Login API
router.post("/auth/login", async (req, res) => {    
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    // Find user by email
    const user = await userSchema.findOne({ email });
    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Compare password with hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || "hello_kitty",
      { expiresIn: "24h" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
});

router.post("/auth/signup", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    // Check if user already exists
    const existingUser = await userSchema.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        message: "User already exists with this email",
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const newUser = new userSchema({
      email,
      password: hashedPassword,
    });

    await newUser.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser._id, email: newUser.email },
      process.env.JWT_SECRET || "hello_kitty",
      { expiresIn: "24h" }
    );

    res.status(201).json({  
      message: "User registered successfully",
      token,
      user: {
        id: newUser._id,
        email: newUser.email,
        createdAt: newUser.createdAt,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
});

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      message: "Access token required"
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || "hello_kitty", (err, user) => {
    if (err) {
      return res.status(403).json({
        message: "Invalid or expired token"
      });
    }
    req.user = user;
    next();
  });
};

// CREATE Task - POST /tasks
router.post("/tasks", authenticateToken, async (req, res) => {  
  try {
    const { taskName, description, dueDate } = req.body;
    const userId = req.user.userId;

    // Validate required fields
    if (!taskName || !dueDate) {
      return res.status(400).json({
        message: "Task name and due date are required"
      });
    }

    // Create new task
    const newTask = new taskSchema({
      taskName,
      description: description || '',
      dueDate: new Date(dueDate),
      userId
    });

    await newTask.save();

    // Invalidate user's task cache
    await invalidateUserCache(userId);

    res.status(201).json({
      message: "Task created successfully",
      task: newTask
    });

  } catch (error) {
    console.error("Create task error:", error);
    res.status(500).json({
      message: "Internal server error"
    });
  }
});

// READ All Tasks - GET /tasks
router.get("/tasks", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const cacheKey = getCacheKey(userId);

    // Try to get from cache first  
    try {
      const cachedTasks = await redisClient.get(cacheKey);
      console.log("Catched Task",cachedTasks);    
      if (cachedTasks) {
        return res.status(200).json({
          message: "Tasks retrieved successfully (from cache)",
          tasks: JSON.parse(cachedTasks),
          cached: true
        });
      }
    } catch (cacheError) {
      console.error('Cache read error:', cacheError);
    }

    // Get from database if not in cache
    const tasks = await taskSchema.find({ userId }).sort({ createdAt: -1 });

    console.log(tasks);     
    
    // Cache the result with 5 minutes TTL (300 seconds)
    try {
      await redisClient.setEx(cacheKey, 300, JSON.stringify(tasks));  
    } catch (cacheError) {
      console.error('Cache write error:', cacheError);
    }

    res.status(200).json({
      message: "Tasks retrieved successfully",
      tasks,
      cached: false
    });

  } catch (error) {
    console.error("Get tasks error:", error);
    res.status(500).json({
      message: "Internal server error"
    });
  }
});

// READ Single Task - GET /tasks/:id
router.get("/tasks/:id", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const taskId = req.params.id;
    const cacheKey = getCacheKey(userId, taskId);

    // Try to get from cache first
    try {
      const cachedTask = await redisClient.get(cacheKey);
      if (cachedTask) {
        return res.status(200).json({
          message: "Task retrieved successfully (from cache)",
          task: JSON.parse(cachedTask),
          cached: true
        });
      }
    } catch (cacheError) {
      console.error('Cache read error:', cacheError);
    }

    // Get from database if not in cache
    const task = await taskSchema.findOne({ _id: taskId, userId });

    if (!task) {
      return res.status(404).json({
        message: "Task not found"
      });
    }

    // Cache the result with 5 minutes TTL (300 seconds)
    try {
      await redisClient.setEx(cacheKey, 300, JSON.stringify(task));
    } catch (cacheError) {
      console.error('Cache write error:', cacheError);
    }

    res.status(200).json({
      message: "Task retrieved successfully",
      task,
      cached: false
    });

  } catch (error) {
    console.error("Get task error:", error);
    res.status(500).json({
      message: "Internal server error"
    });
  }
});

// UPDATE Task - POST /tasks/update/
router.post("/tasks/update/", authenticateToken, async (req, res) => {   
  try {
    const { id, taskName, description, dueDate } = req.body;

    // Validate required field
    if (!id) {
      return res.status(400).json({
        message: "Task ID is required"
      });
    }

    // Find and update task by ID      
    const updatedTask = await taskSchema.findByIdAndUpdate(  
      id,
      {
        ...(taskName && { taskName }),
        ...(description !== undefined && { description }),
        ...(dueDate && { dueDate: new Date(dueDate) })
      },
      { new: true }
    );

    if (!updatedTask) {
      return res.status(404).json({
        message: "Task not found"
      });
    }

    // Invalidate user's task cache
    await invalidateUserCache(req.user.userId);

    res.status(200).json({
      message: "Task updated successfully",
      task: updatedTask
    });

  } catch (error) {
    console.error("Update task error:", error);
    res.status(500).json({
      message: "Internal server error"
    });
  }
});

// DELETE Task - POST /tasks/delete/
router.post("/tasks/delete/", authenticateToken, async (req, res) => {
  try {
    const { id } = req.body;

    // Validate required field
    if (!id) {
      return res.status(400).json({
        message: "Task ID is required"
      });  
    }

    // Find and delete task by ID
    const deletedTask = await taskSchema.findByIdAndDelete(id);

    if (!deletedTask) {
      return res.status(404).json({
        message: "Task not found"
      });
    }   

    // Invalidate user's task cache
    await invalidateUserCache(req.user.userId);

    res.status(200).json({
      message: "Task deleted successfully",
      task: deletedTask
    });

  } catch (error) {
    console.error("Delete task error:", error);
    res.status(500).json({
      message: "Internal server error"
    });
  }
});

// CLEAR CACHE - POST /clear-cache
router.post("/clear-cache", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    await invalidateUserCache(userId);

    res.status(200).json({
      message: "Cache cleared successfully for user"    
    });

  } catch (error) {
    console.error("Clear cache error:", error);
    res.status(500).json({
      message: "Internal server error"
    });
  }
});

module.exports = router;
