import Link from 'next/link';
import { Button } from '../components/ui/button';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center space-y-10 py-10 text-center">
      <div className="space-y-6">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
          Create and Share Polls Easily
        </h1>
        <p className="text-xl text-muted-foreground">
          Smart Poll helps you create polls, gather responses, and analyze results in real-time.
        </p>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4">
        <Button asChild size="lg">
          <Link href="/polls/create">Create a Poll</Link>
        </Button>
        <Button variant="outline" asChild size="lg">
          <Link href="/dashboard">View Your Polls</Link>
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl mt-16">
        <div className="flex flex-col items-center p-6 bg-card rounded-lg border border-border">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </div>
          <h3 className="text-xl font-bold">Create</h3>
          <p className="text-muted-foreground text-center mt-2">Design custom polls with multiple question types</p>
        </div>
        
        <div className="flex flex-col items-center p-6 bg-card rounded-lg border border-border">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <h3 className="text-xl font-bold">Share</h3>
          <p className="text-muted-foreground text-center mt-2">Distribute polls via links or QR codes</p>
        </div>
        
        <div className="flex flex-col items-center p-6 bg-card rounded-lg border border-border">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
              <path d="M12 20V10"></path>
              <path d="M18 20V4"></path>
              <path d="M6 20v-4"></path>
            </svg>
          </div>
          <h3 className="text-xl font-bold">Analyze</h3>
          <p className="text-muted-foreground text-center mt-2">View real-time results and detailed analytics</p>
        </div>
      </div>
    </div>
  );
}