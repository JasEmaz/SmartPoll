# Smart Poll App

This is a [Next.js](https://nextjs.org) polling application that allows users to create, share, and analyze polls. The project is built with Next.js, React, TypeScript, and Tailwind CSS, with Shadcn UI components for the interface.

## Features

- User authentication (login/register)
- Create polls with multiple options
- View and share polls with unique links
- Dashboard to manage your polls
- Protected routes for authenticated users
- Responsive design with Shadcn UI components

## Installation

1. Clone the repository

```bash
git clone <repository-url>
cd smart_poll
```

2. Install dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Install Shadcn UI components

```bash
npm install @radix-ui/react-slot @radix-ui/react-label @radix-ui/react-accordion @radix-ui/react-icons clsx tailwind-merge class-variance-authority
# or
yarn add @radix-ui/react-slot @radix-ui/react-label @radix-ui/react-accordion @radix-ui/react-icons clsx tailwind-merge class-variance-authority
# or
pnpm add @radix-ui/react-slot @radix-ui/react-label @radix-ui/react-accordion @radix-ui/react-icons clsx tailwind-merge class-variance-authority
```

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
smart_poll/
├── app/                # App router pages
│   ├── auth/           # Authentication pages
│   ├── dashboard/      # Dashboard pages
│   ├── polls/          # Poll pages
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Home page
├── components/         # React components
│   ├── auth/           # Auth components
│   ├── polls/          # Poll components
│   └── ui/             # UI components (Shadcn)
├── lib/                # Utility functions
└── public/             # Static assets
```

## Authentication

This project is set up to use Supabase for authentication. You'll need to:

1. Create a Supabase project
2. Set up environment variables for Supabase in a `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

The authentication implementation is currently using placeholders that need to be replaced with actual Supabase client code.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn-pages-router) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/pages/building-your-application/deploying) for more details.
