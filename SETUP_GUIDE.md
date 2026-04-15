# Homework Portal Setup Guide

This project is the starting point for your homework submission website.

## What is already done

- A Next.js app has been created.
- A home page explains the project.
- The instructor page now saves real assignments to Supabase.
- The instructor page now lets you build a question bank for each assignment.
- The student page now uploads files to Supabase storage.
- The student page now pulls 3 random questions from the assignment bank and saves answers.
- The review page now shows submissions, uploaded files, questions, and answers.
- The instructor and review pages are now protected by an admin login.
- The app now uses server routes for private instructor/review data and student submission writes.
- Supabase has been connected with environment variables and a client helper.

## Main pages

- `/` is the home page
- `/instructor` is the instructor dashboard
- `/submit` is the student submission page

## What we will build next

1. Polish the review page if needed
2. Replace the random question bank with OpenAI later if you want

## Admin login variables

- `ADMIN_ACCESS_PASSWORD` is the password you will type on the instructor login page
- `ADMIN_SESSION_SECRET` is a long random value used for the protected session cookie
- `SUPABASE_SERVICE_ROLE_KEY` is used only on the server for locked-down database access

## Required SQL

Run the SQL in `SUPABASE_QUESTION_BANK.sql` before using the question bank.
Run the SQL in `SUPABASE_LOCKDOWN.sql` before sharing the site with students.

## Supabase files

- `.env.local` stores your real project values on your computer
- `.env.example` shows the variable names for future setup
- `src/lib/supabase.ts` creates the reusable Supabase client

## How to run the app

```bash
npm run dev
```

Then open the `Local` address shown in your terminal.
