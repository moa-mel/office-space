# Office-Space

A collaborative virtual office platform designed to bring remote teams together with seamless communication and AI-powered productivity tools. This project provides real-time chat, video calls, event scheduling, and intelligent insights from your meetings.

## Features

This application provides a rich set of features to enhance remote work collaboration:

*   **Authentication:** Secure user sign-up, sign-in with email/password or Google OAuth, and email verification.
*   **Office Management:**
    *   Create and customize virtual offices.
    *   Invite members and manage roles (Admin, Member).
*   **Real-time Communication:**
    *   Direct and group chat with text and file sharing.
    *   Real-time video and audio calls.
*   **Collaboration & Scheduling:**
    *   A shared calendar for scheduling team events.
    *   Event notifications and attendance status (Accepted, Declined, Pending).
*   **AI-Powered Insights:**
    *   Automatic transcription of video/audio calls.
    *   AI-generated summaries of meetings, highlighting key points and action items.
    *   Semantic search across all past call transcripts to find information instantly.

## Tech Stack

*   **Backend:** [NestJS](https://nestjs.com/) - A progressive Node.js framework for building efficient and scalable server-side applications.
*   **Database ORM:** [Prisma](https://www.prisma.io/) - A next-generation ORM for Node.js and TypeScript.
*   **Database:** [PostgreSQL](https://www.postgresql.org/) (or your preferred SQL database).
*   **Real-time:** [Socket.IO](https://socket.io/) or similar WebSocket library for chat and call signaling.
*   **AI:** [Google Generative AI](https://ai.google.dev/) for transcription, summarization, and embeddings.

*(You can add your frontend technologies here, e.g., React, Next.js, etc.)*

## ⚙️ Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

*   Node.js (v18 or later)
*   npm or yarn
*   A running PostgreSQL database instance

### Installation

1.  **Clone the repository:**
    ```sh
    git clone <your-repository-url>
    cd office-space
    ```

2.  **Install dependencies:**
    ```sh
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root of the project and add the necessary environment variables. See the `.env.example` file for a template.
    ```env
    # PostgreSQL Database URL
    DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"

    # Google Generative AI API Key
    GEMINI_API_KEY="your-google-ai-api-key"

    # Add other variables for JWT secrets, Google OAuth, etc.
    ```

4.  **Run database migrations:**
    Apply the database schema using Prisma Migrate.
    ```sh
    npx prisma migrate dev
    ```

### Running the Application

To start the development server, run:

```sh
npm run start:dev
```

The application will be running on `http://localhost:3000` (or the port you have configured).