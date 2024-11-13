# CoupGame

CoupGame is a full-stack web application that brings the popular strategy board game "Coup" to the digital realm. Built with a responsive and dynamic front-end using React and TypeScript, and a robust backend powered by ASP.NET Core and SignalR, CoupGame offers real-time multiplayer experiences, smooth gameplay, and an intuitive user interface.

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Technologies Used](#technologies-used)
  - [Frontend](#frontend)
  - [Backend](#backend)
- [Project Structure](#project-structure)
  - [Frontend Structure](#frontend-structure)
  - [Backend Structure](#backend-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the Application](#running-the-application)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## Introduction

CoupGame is an online adaptation of the classic strategy game "Coup." Players engage in a battle of deception and manipulation, aiming to remove opponents' influence and emerge victorious. The application supports multiple concurrent game rooms, allowing friends and strangers alike to enjoy intense matches from anywhere in the world.

With real-time updates, responsive design, and secure authentication mechanisms, CoupGame ensures an engaging and seamless gaming experience for all users.

## Features

- **User Authentication**: Secure registration and login using JWT tokens.
- **Real-Time Multiplayer**: Leveraging SignalR for instantaneous game state synchronization.
- **Game Rooms**: Create, search, join, and spectate game rooms with ease.
- **Responsive Design**: Seamless experience across devices with Material-UI components.
- **Bot Integration**: Add AI-controlled players to fill empty slots in a game.
- **Internationalization**: Support for multiple languages using i18next.
- **Dynamic UI Animations**: Enhanced user experience with Framer Motion animations.

## Technologies Used

### Frontend

- **React**: JavaScript library for building user interfaces.
- **TypeScript**: Superset of JavaScript for static typing.
- **Material-UI (MUI)**: React components for faster and easier web development.
- **SignalR**: Real-time communication framework for WebSockets.
- **Framer Motion**: React animation library for creating smooth and engaging animations.
- **React Router**: Declarative routing for React applications.
- **i18next**: Internationalization framework for translating the UI.
- **Axios**: Promise-based HTTP client for the browser.

### Backend

- **ASP.NET Core**: Cross-platform, high-performance framework for building modern applications.
- **C#**: Programming language for backend logic.
- **SignalR**: Real-time communication framework for WebSockets.
- **Entity Framework Core**: ORM for database interactions.
- **Microsoft.Extensions.Logging**: Logging framework for capturing application events.
- **Dependency Injection**: For managing service lifetimes and dependencies.

## Project Structure

### Frontend Structure

The frontend is organized into several key directories, each encapsulating specific functionalities.

#### Key Files

- [`src/pages/Home/Home.tsx`](CoupGameFrontend/src/pages/Home/Home.tsx):  
  The landing page of the application, providing an overview of the game, rules, and navigation buttons to join or log in.

- [`src/pages/Game/GameLobby.tsx`](CoupGameFrontend/src/pages/Game/GameLobby.tsx):  
  Represents the game lobby where players wait for the game to start. Shows player lists, game status, and options to start the game, add bots, or switch to spectator mode.

- [`src/pages/Game/GameHub.ts`](CoupGameFrontend/src/pages/Game/GameHub.ts):  
  Manages the SignalR connection, handling real-time events related to the game state and player actions.

- [`src/pages/Game/GameRoom.tsx`](CoupGameFrontend/src/pages/Game/GameRoom.tsx):  
  The main game room where active gameplay occurs. It handles game state updates, user actions, and integrates with the `GameHub` for real-time communication.

- [`src/pages/Rooms/Rooms.tsx`](CoupGameFrontend/src/pages/Rooms/Rooms.tsx):  
  Displays available game rooms, allows users to search for rooms, join, or spectate existing rooms. Includes pagination, search functionality, and real-time room data refresh.

- [`public/index.html`](CoupGameFrontend/public/index.html):  
  The main HTML template for the React application.

### Backend Structure

The backend follows a typical ASP.NET Core project structure with controllers, hubs, services, and repositories organized for clear separation of concerns.

#### Key Files

- [`Hubs/GameHub.cs`](CoupGameBackend/Hubs/GameHub.cs):  
  Implements the SignalR hub for handling real-time communication between the server and connected clients. It manages user connections, game state emissions, and various game-related events like adding bots.

- [`Controllers/GameController.cs`](CoupGameBackend/Controllers/GameController.cs):  
  Handles API endpoints related to game management, such as creating games, starting games, restarting games, and switching to spectator mode.

- [`Controllers/AuthController.cs`](CoupGameBackend/Controllers/AuthController.cs):  
  Manages user authentication, including registration, login, and token verification.

- [`Controllers/RoomsController.cs`](CoupGameBackend/Controllers/RoomsController.cs):  
  Provides endpoints for retrieving public game rooms, searching for specific rooms, and creating new game rooms.

- **Services**:  
  Contains business logic related to games, users, challenges, actions, turns, scheduling, etc.

- **Repositories**:  
  Handles data persistence and retrieval for games and users.

- **Models**:  
  Defines the data structures used across the application, such as `Game`, `User`, `ActionLog`, `PendingAction`, etc.

## Getting Started

### Prerequisites

- **Node.js** (v14 or above)
- **npm** or **yarn**
- **.NET 6.0 SDK** or higher
- **SQL Server** or another supported database (if required)

### Installation

1. **Clone the Repository**

   ```bash
   git clone https://github.com/yourusername/CoupGame.git
   cd CoupGame
   ```

2. **Setup Backend**

   Navigate to the backend directory and install dependencies.

   ```bash
   cd CoupGameBackend
   dotnet restore
   ```

   Configure the database connection string in `appsettings.json`.

3. **Setup Frontend**

   Open a new terminal window, navigate to the frontend directory, and install dependencies.

   ```bash
   cd CoupGameFrontend
   npm install
   # or
   yarn install
   ```

   Configure environment variables as needed (e.g., API endpoints, SignalR hub URL).

### Running the Application

1. **Run the Backend**

   In the `CoupGameBackend` directory:

   ```bash
   dotnet run
   ```

   The backend server will start, typically on `https://localhost:5001`.

2. **Run the Frontend**

   In the `CoupGameFrontend` directory:

   ```bash
   npm start
   # or
   yarn start
   ```

   The frontend application will start, typically on `http://localhost:3000`.

3. **Access the Application**

   Open your browser and navigate to `http://localhost:3000` to access CoupGame.

## Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the repository**

2. **Create a new branch**

   ```bash
   git checkout -b feature/YourFeatureName
   ```

3. **Commit your changes**

   ```bash
   git commit -m "Add some feature"
   ```

4. **Push to the branch**

   ```bash
   git push origin feature/YourFeatureName
   ```

5. **Open a Pull Request**

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

For questions or feedback, please contact [joaoc_silva22@hotmail.com](mailto:joaoc_silva22@hotmail.com).