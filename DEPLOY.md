# Deployment Guide for Home Liability App

This guide explains how to deploy your Next.js application to Vercel (recommended free hosting).

## Prerequisites

1.  **Vercel Account**: Sign up at [vercel.com](https://vercel.com/signup).
2.  **GitHub Account**: Recommended for easy updates.

## Option 1: Deploy via GitHub (Recommended)

1.  **Push your code to GitHub**:
    If you haven't already:
    *   Create a repository on GitHub.
    *   Push your local code:
        ```bash
        git remote add origin <your-github-repo-url>
        git push -u origin main
        ```

2.  **Import to Vercel**:
    *   Go to Vercel Dashboard -> "Add New..." -> "Project".
    *   Select "Continue with GitHub" and choose your repo.

3.  **Environment Variables (Critical!)**:
    In the "Configure Project" step, expand **Environment Variables**. copy ALL variables from `.env.local`.
    
    **Important for Private Key**:
    *   Copy the `FIREBASE_PRIVATE_KEY` exactly as it is in `.env.local` (inside the quotes).
    *   Vercel handles it well, and our code `lib/firebaseAdmin.ts` already handles newline characters (`\n`).

4.  **Deploy**:
    *   Click "Deploy".
    *   Wait for the build. You'll get a URL like `home-app.vercel.app`.

## Option 2: Deploy using Vercel CLI

If you don't want to use GitHub:
1.  Install Vercel CLI: `npm i -g vercel`
2.  Login: `vercel login`
3.  Deploy: Run `vercel` in this folder. Follow the prompts.

## Post-Deployment Setup

1.  **Firebase Authentication**:
    *   Go to [Firebase Console](https://console.firebase.google.com/) -> Authentication -> Settings -> Authorized Domains.
    *   Add your new Vercel domain (e.g., `home-app.vercel.app`).
    *   This is required for login to work!

2.  **Verify Admin Features**:
    *   Log in as an admin.
    *   Try creating a user or editing an asset to ensure the Admin SDK works.
