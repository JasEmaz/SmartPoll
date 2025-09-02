'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { deletePoll } from '@/app/actions/poll-actions';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface DeletePollButtonProps {
  pollId: string;
  isExpired?: boolean;
}

export function DeletePollButton({ pollId, isExpired = false }: DeletePollButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this poll? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deletePoll(pollId);
      
      if (result.success) {
        // Refresh the page to show updated polls
        router.refresh();
      } else {
        alert(result.error || 'Failed to delete poll');
      }
    } catch (error) {
      console.error('Error deleting poll:', error);
      alert('Failed to delete poll. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Tooltip content="Delete poll">
      <Button
        onClick={handleDelete}
        size="sm"
        variant="outline"
        disabled={isDeleting}
        className={`
          ${isExpired 
            ? 'border-red-300 text-red-700 hover:bg-red-100 hover:border-red-400'
            : 'border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400'
          }
          ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <Trash2 className="h-4 w-4" />
        {isDeleting ? '...' : ''}
      </Button>
    </Tooltip>
  );
}
