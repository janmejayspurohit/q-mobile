# 🎮 Kahoot Clone - Real-time Quiz Game

A full-featured, real-time multiplayer quiz application similar to Kahoot, built with Next.js, Socket.io, MongoDB, and Tailwind CSS.

## ✨ Features

- 🔐 **User Authentication** - Register/Login with username and generic password
- 👨‍💼 **Admin Dashboard** - Full CRUD operations for questions and games
- 🎯 **Real-time Gameplay** - Live multiplayer quiz with Socket.io
- ⏱️ **Countdown Timer** - 15-second timer for each question
- 🏆 **Live Leaderboard** - Real-time score updates
- 📊 **Beautiful Graphs** - Top 5 winners visualization with Recharts
- 🌐 **Ngrok Support** - Easy external access for remote players

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- MongoDB installed and running
- Ngrok installed (for external access)

### Installation

1. **Install Dependencies**

```bash
npm install
```

2. **Configure Environment Variables**

Make sure `.env.local` has these settings:

```env
MONGODB_URI=mongodb://localhost:27017/kahoot-clone
JWT_SECRET=your-super-secret-jwt-key
GENERIC_PASSWORD=QUIZ2024
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
ADMIN_EMAIL=admin@kahoot.com
ADMIN_PASSWORD=admin123
```

3. **Start MongoDB**

```bash
# On Linux/Mac
sudo systemctl start mongod

# Or using mongod directly
mongod --dbpath=/path/to/data
```

4. **Run the Development Server**

```bash
npm run dev
```

The server will start on `http://localhost:3000`

5. **Setup Ngrok (Optional - for external access)**

In a new terminal:

```bash
npm run tunnel
```

This will create a public URL that external users can access.

## 📖 Usage Guide

### For Admin:

1. **Login as Admin**
   - Go to `http://localhost:3000/admin/login`
   - Email: `admin@kahoot.com`
   - Password: `admin123`

2. **Create Questions**
   - Click "+ New Question"
   - Fill in question text, correct answer, category, difficulty, points, and time limit
   - Click "Create Question"

3. **Create a Game**
   - Click "🎮 Create Game"
   - Enter game title
   - Select questions to include
   - Click "Create Game"
   - **Note the 6-character game code!**

4. **Start the Game**
   - Click "Control Room" on the game
   - Share the game code with players
   - Wait for players to join
   - Click "🚀 Start Game" when ready

### For Players:

1. **Register/Login**
   - Go to `http://localhost:3000`
   - Register with username, password, and generic password (`QUIZ2024`)
   - Or login if you already have an account

2. **Join a Game**
   - Enter the 6-character game code from the admin
   - Click "Join Game 🎮"

3. **Play!**
   - Wait in the lobby until admin starts
   - Answer questions within the time limit
   - See your score update in real-time
   - View final results and top 5 leaderboard

## 🛠️ Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS 4
- **Backend**: Next.js API Routes, Custom Node.js server
- **Real-time**: Socket.io
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT, bcryptjs
- **Charts**: Recharts
- **Tunneling**: Ngrok

## 🎯 Scoring System

- Base points per question (default: 100)
- Speed bonus: Faster answers get more points
- Formula: `points = basePoints * (0.5 + 0.5 * timeBonus)`
- Real-time leaderboard updates

## 📝 Scripts

- `npm run dev` - Start development server with Socket.io
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run tunnel` - Start ngrok tunnel on port 3000

---

**Happy Quizzing! 🎉**
