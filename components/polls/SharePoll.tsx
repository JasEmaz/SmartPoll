'use client';

import { useState } from 'react';
import QRCode from 'react-qr-code';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Share2, Facebook, Twitter, Linkedin, MessageCircle } from 'lucide-react';

interface SharePollProps {
  pollId: string;
  pollQuestion?: string;
}

export function SharePoll({ pollId, pollQuestion }: SharePollProps) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const pollUrl = `${window.location.origin}/polls/${pollId}`;
  const shareText = pollQuestion ? `Check out this poll: ${pollQuestion}` : 'Check out this poll!';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(pollUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const shareOnSocialMedia = (platform: string) => {
    const encodedUrl = encodeURIComponent(pollUrl);
    const encodedText = encodeURIComponent(shareText);
    
    let shareUrl = '';
    
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodedText}%20${encodedUrl}`;
        break;
      default:
        return;
    }
    
    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  return (
    <div className="space-y-6 p-6 bg-card rounded-lg border">
      <div className="flex items-center gap-2">
        <Share2 className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Share this poll</h3>
      </div>
      
      {/* Copy Link Section */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Poll Link</label>
        <div className="flex items-center space-x-2">
          <Input value={pollUrl} readOnly className="flex-1" />
          <Button onClick={copyToClipboard} size="sm" variant="outline">
            <Copy className="h-4 w-4 mr-1" />
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>
        {copied && <p className="text-xs text-green-600">Link copied to clipboard!</p>}
      </div>
      
      {/* Social Media Share Buttons */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Share on Social Media</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Button 
            onClick={() => shareOnSocialMedia('twitter')}
            size="sm"
            variant="outline"
            className="flex items-center justify-center gap-2 hover:bg-blue-50 hover:border-blue-300"
          >
            <Twitter className="h-4 w-4" />
            <span className="hidden sm:inline">Twitter</span>
          </Button>
          
          <Button 
            onClick={() => shareOnSocialMedia('facebook')}
            size="sm"
            variant="outline"
            className="flex items-center justify-center gap-2 hover:bg-blue-50 hover:border-blue-300"
          >
            <Facebook className="h-4 w-4" />
            <span className="hidden sm:inline">Facebook</span>
          </Button>
          
          <Button 
            onClick={() => shareOnSocialMedia('linkedin')}
            size="sm"
            variant="outline"
            className="flex items-center justify-center gap-2 hover:bg-blue-50 hover:border-blue-300"
          >
            <Linkedin className="h-4 w-4" />
            <span className="hidden sm:inline">LinkedIn</span>
          </Button>
          
          <Button 
            onClick={() => shareOnSocialMedia('whatsapp')}
            size="sm"
            variant="outline"
            className="flex items-center justify-center gap-2 hover:bg-green-50 hover:border-green-300"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">WhatsApp</span>
          </Button>
        </div>
      </div>
      
      {/* QR Code Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-muted-foreground">QR Code</label>
          <Button 
            onClick={() => setShowQR(!showQR)}
            size="sm"
            variant="ghost"
          >
            {showQR ? 'Hide QR Code' : 'Show QR Code'}
          </Button>
        </div>
        
        {showQR && (
          <div className="flex flex-col items-center space-y-3">
            <div className="bg-white p-4 rounded-lg border">
              <QRCode value={pollUrl} size={150} />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Scan this QR code to access the poll
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
