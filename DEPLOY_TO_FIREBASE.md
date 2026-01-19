# Deploying to Firebase Hosting

This guide outlines the steps to deploy your `uidai-combined` React application to Firebase Hosting.

## Prerequisites
1.  **Firebase Project**: Ensure you have created a project in the [Firebase Console](https://console.firebase.google.com/).
2.  **Node.js**: You already have this installed.

## Step 1: Install Firebase Tools
Open a new terminal (or use your existing one) and install the Firebase CLI globally:
```bash
npm install -g firebase-tools
```

## Step 2: Login to Firebase
Authenticate the CLI with your Google account:
```bash
firebase login
```
This will open a browser window for you to log in.

## Step 3: Configure Project
1.  Open `.firebaserc` in your code editor.
2.  Replace `your-firebase-project-id` with your actual **Project ID** from the Firebase Console (found in Project Settings).

## Step 4: Build & Deploy
Run the following command to build your app and deploy it to the web:
```bash
npm run build
firebase deploy --only hosting
```

Your app will be live at `https://<your-project-id>.web.app`!
