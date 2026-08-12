# Homework Portal Setup Guide

This project is the starting point for your homework submission website.

## What is already done

- A Next.js app has been created.
- A home page explains the project.
- The instructor page now saves real assignments to Supabase.
- The instructor page now lets you build a question bank for each assignment.
- The student page now uploads files to Supabase storage.
- After a student uploads a `.pptx`, `.xlsx`, or `.xls` file, the server downloads it from
  Supabase Storage, extracts the visible text, and sends it to Claude to generate 3
  follow-up questions specific to that submission.
- If Claude generation fails for any reason (missing API key, API error, unreadable file
  type such as legacy `.ppt`), the app automatically falls back to 3 random questions from
  that assignment's question bank, so the student is never blocked. Because of this, the
  question bank is still worth keeping populated with at least 3 questions per assignment.
- The review page now shows submissions, uploaded files, questions, and answers.
- The instructor and review pages are now protected by an admin login.
- The app now uses server routes for private instructor/review data and student submission writes.
- Supabase has been connected with environment variables and a client helper.

## Main pages

- `/` is the home page
- `/instructor` is the instructor dashboard
- `/submit` is the student submission page
- `/review` is the instructor review dashboard

## What we will build next

1. Polish the review page if needed
2. Consider converting legacy `.ppt`/`.xls` files automatically instead of relying on the
   question-bank fallback for those file types

## Admin login variables

- `ADMIN_ACCESS_PASSWORD` is the password you will type on the instructor login page
- `ADMIN_SESSION_SECRET` is a long random value used for the protected session cookie
- `SUPABASE_SERVICE_ROLE_KEY` is used only on the server for locked-down database access
- `ANTHROPIC_API_KEY` is used only on the server to call Claude for question generation.
  Get one from the Claude Platform console (platform.claude.com) and never expose it to the
  browser/client code.

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
