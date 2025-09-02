'use client';

import { useState } from 'react';
import QRCode from 'react-qr-code';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { Copy, Share2, QrCode } from 'lucide-react';

interface DashboardSharePollProps {
  pollId: string;
  pollQuestion: string;
  isExpired: boolean;
  className?: string;
}

export function DashboardSharePoll({ 
  pollId, 
  pollQuestion, 
  isExpired,
  className = ""
}: DashboardSharePollProps) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const pollUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/polls/${pollId}`;

  const copyToClipboard = () => {
    if (isExpired) return;
    
    navigator.clipboard.writeText(pollUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const toggleQR = () => {
    if (isExpired) return;
    setShowQR(!showQR);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Copy Link Button */}
      <Tooltip 
        content={isExpired ? "Poll expired" : "Copy poll link"}
        disabled={!isExpired && !copied}
      >
        <Button
          onClick={copyToClipboard}
          size="sm"
          variant="outline"
          disabled={isExpired}
          className={`
            ${isExpired 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:bg-blue-50 hover:border-blue-300'
            }
          `}
        >
          <Copy className="h-4 w-4" />
          {copied ? 'Copied!' : 'Share'}
        </Button>
      </Tooltip>

      {/* QR Code Button */}
      <Tooltip 
        content={isExpired ? "Poll expired" : "Show QR code"}
        disabled={!isExpired}
      >
        <Button
          onClick={toggleQR}
          size="sm"
          variant="outline"
          disabled={isExpired}
          className={`
            ${isExpired 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:bg-green-50 hover:border-green-300'
            }
          `}
        >
          <QrCode className="h-4 w-4" />
        </Button>
      </Tooltip>

      {/* QR Code Modal/Popup */}
      {showQR && !isExpired && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">QR Code</h3>
              <Button 
                onClick={() => setShowQR(false)}
                size="sm"
                variant="ghost"
              >
                ×
              </Button>
            </div>
            
            <div className="flex flex-col items-center space-y-3">
              <div className="bg-white p-4 rounded-lg border">
                <QRCode value={pollUrl} size={200} />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Scan to access: {pollQuestion}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
