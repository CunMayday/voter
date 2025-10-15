<!-- v1.0: Initial project guide covering Firebase, local development, and Vercel deployment. -->
# Purdue Team Voting Board

A real-time suggestion and voting board tailored for Purdue teams. The interface follows the university color system, supports responsive layouts, and updates immediately as teammates add ideas, votes, or comments.

## Features

- 🔐 Name prompt so every participant appears on the board
- ⚡ Real-time sync for suggestions, votes, and pro/con/neutral comments via Firebase Realtime Database
- 🗳️ Upvote/downvote workflow with the ability to reverse your choice
- 📝 Structured discussion using labeled comments and score-based sorting
- ♿ Accessible, high-contrast styling that meets Purdue branding guidance

## Prerequisites

- [Node.js 18+](https://nodejs.org/) and npm
- A Firebase project with the **Realtime Database** enabled
- A Vercel account connected to GitHub for deployment

## Firebase configuration

1. Create a new Firebase project or use an existing one at [console.firebase.google.com](https://console.firebase.google.com/).
2. In **Project settings → General**, add a new Web app (</>) and register it.
3. From the Firebase console sidebar choose **Build → Realtime Database**, click **Create database**, and select the desired region. Start in **production mode** for access control.
4. Copy the configuration snippet values and add them to a `.env` file in this repository using the following variables:

   ```bash
   VITE_FIREBASE_API_KEY=your-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
   VITE_FIREBASE_DATABASE_URL=https://your-app-default-rtdb.region.firebasedatabase.app
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   VITE_FIREBASE_APP_ID=your-app-id
   ```

5. In **Realtime Database → Rules**, configure access as needed for your team. For small trusted groups a rule resembling the following is a starting point:

   ```json
   {
     "rules": {
       ".read": true,
       ".write": true
     }
   }
   ```

   Tighten the rules for production environments by enforcing authentication or specific paths.
6. Deploy the updated rules and ensure the database URL matches the `.env` file.

## Data structure

```
suggestions: {
  suggestionId: {
    text: string,
    author: string,
    authorId: string,
    createdAt: number (server timestamp),
    votes: {
      userId: 1 | -1
    },
    comments: {
      commentId: {
        text: string,
        stance: 'pro' | 'con' | 'neutral',
        author: string,
        authorId: string,
        createdAt: number (server timestamp)
      }
    }
  }
}
```

Scores are calculated client-side as the sum of vote values, ensuring real-time updates without additional aggregation fields.

## Local development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm run dev
   ```

3. Visit the printed local URL (default `http://localhost:5173`) to interact with the live-refreshing board.

## Linting

Run the lint task to catch React and accessibility issues early:

```bash
npm run lint
```

## Build for production

```
npm run build
```

The output appears in the `dist/` folder and is optimized for deployment.

## Deploy to Vercel

1. Push this repository to GitHub.
2. In [vercel.com/new](https://vercel.com/new), import the repository.
3. Under **Environment Variables**, add the Firebase variables listed above.
4. Keep the default build command (`npm run build`) and output directory (`dist`).
5. Deploy. Each subsequent push to the default branch triggers an automatic redeploy.

## Accessibility and design notes

- Purdue golds, black, and supporting grays are implemented via Tailwind custom colors.
- Focus states use high-contrast outlines that comply with WCAG 2.1 AA.
- Layouts are responsive from small screens through desktops, and live regions announce vote counts and list lengths for assistive tech users.

## Troubleshooting

- **Firebase errors at runtime**: Double-check environment variables or network connectivity. The app surfaces user-friendly errors when Firebase is unreachable.
- **Votes not persisting**: Confirm Realtime Database rules allow writes for your authenticated (or anonymous) users.
- **Styling mismatches**: Run `npm run dev` and ensure Tailwind compiled classes reflect the configuration in `tailwind.config.js`.

Happy voting!
