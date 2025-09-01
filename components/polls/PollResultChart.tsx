'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { AlertCircle, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';

interface PollOption {
  id: string;
  option_text: string;
  votes: number;
}

interface PollResults {
  question: string;
  options: PollOption[];
  totalVotes: number;
}

interface PollResultChartProps {
  pollResults?: PollResults;
  className?: string;
  isLoading?: boolean;
  showDetailedView?: boolean;
}

// Enhanced color palette with better accessibility
const COLORS = [
  'hsl(221, 83%, 53%)',  // Blue
  'hsl(142, 71%, 45%)',  // Green
  'hsl(47, 96%, 53%)',   // Yellow
  'hsl(0, 84%, 60%)',    // Red
  'hsl(271, 91%, 65%)',  // Purple
  'hsl(12, 76%, 61%)',   // Orange
  'hsl(176, 77%, 47%)',  // Teal
  'hsl(339, 82%, 65%)',  // Pink
];

// Validation helper functions
const validatePollResults = (pollResults?: PollResults): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!pollResults) {
    errors.push('Poll results data is missing');
    return { isValid: false, errors };
  }

  if (!pollResults.question || pollResults.question.trim().length === 0) {
    errors.push('Poll question is required');
  }

  if (!Array.isArray(pollResults.options)) {
    errors.push('Poll options must be an array');
  } else if (pollResults.options.length === 0) {
    errors.push('Poll must have at least one option');
  } else {
    pollResults.options.forEach((option, index) => {
      if (!option.id) errors.push(`Option ${index + 1} is missing an ID`);
      if (!option.option_text || option.option_text.trim().length === 0) {
        errors.push(`Option ${index + 1} is missing text`);
      }
      if (typeof option.votes !== 'number' || option.votes < 0) {
        errors.push(`Option ${index + 1} has invalid vote count`);
      }
    });
  }

  if (typeof pollResults.totalVotes !== 'number' || pollResults.totalVotes < 0) {
    errors.push('Total votes must be a non-negative number');
  }

  return { isValid: errors.length === 0, errors };
};

export default function PollResultChart({ 
  pollResults, 
  className = '',
  isLoading = false,
  showDetailedView = true
}: PollResultChartProps) {
  // Validation
  const { isValid, errors } = validatePollResults(pollResults);

  // Memoized chart data with enhanced calculations
  const chartData = useMemo(() => {
    if (!pollResults || !isValid) return [];
    
    return pollResults.options
      .map((option, index) => ({
        name: option.option_text.length > 20 
          ? `${option.option_text.substring(0, 17)}...` 
          : option.option_text,
        fullName: option.option_text,
        votes: option.votes,
        percentage: pollResults.totalVotes > 0 
          ? Math.round((option.votes / pollResults.totalVotes) * 100) 
          : 0,
        color: COLORS[index % COLORS.length],
        id: option.id,
      }))
      .sort((a, b) => b.votes - a.votes); // Sort by votes descending
  }, [pollResults, isValid]);

  // Loading state
  if (isLoading) {
    return (
      <Card className={`animate-pulse ${className}`}>
        <CardHeader>
          <div className="h-6 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/4"></div>
        </CardHeader>
        <CardContent>
          <div className="w-full h-80 bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (!isValid) {
    return (
      <Card className={`border-destructive/50 ${className}`}>
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Invalid Poll Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {errors.map((error, index) => (
              <p key={index} className="text-sm text-destructive">• {error}</p>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Enhanced custom tooltip component
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{
      payload: {
        votes: number;
        percentage: number;
        fullName: string;
        name: string;
      };
    }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl transition-all duration-200">
          <p className="font-semibold text-foreground mb-1">{data.fullName}</p>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-3 w-3" />
              {data.votes} vote{data.votes !== 1 ? 's' : ''} ({data.percentage}%)
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Calculate winner for enhanced display
  const winner = chartData.length > 0 ? chartData[0] : null;

  return (
    <Card className={`transition-all duration-300 hover:shadow-lg ${className}`}>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold leading-tight">
          {pollResults!.question}
        </CardTitle>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Total votes: {pollResults!.totalVotes}</span>
          {winner && pollResults!.totalVotes > 0 && (
            <span className="flex items-center gap-1 font-medium text-primary">
              <TrendingUp className="h-3 w-3" />
              Leading: {winner.fullName}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {pollResults!.totalVotes > 0 ? (
          <>
            {/* Enhanced Chart */}
            <div className="w-full h-80 transition-all duration-300">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 60,
                  }}
                >
                  <defs>
                    {chartData.map((entry, index) => (
                      <linearGradient key={entry.id} id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={entry.color} stopOpacity={0.9} />
                        <stop offset="100%" stopColor={entry.color} stopOpacity={0.6} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="hsl(var(--muted))" 
                    opacity={0.5}
                  />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ 
                      fontSize: 12,
                      fill: 'hsl(var(--muted-foreground))'
                    }}
                    stroke="hsl(var(--border))"
                  />
                  <YAxis 
                    tick={{ 
                      fontSize: 12,
                      fill: 'hsl(var(--muted-foreground))'
                    }}
                    stroke="hsl(var(--border))"
                    label={{ 
                      value: 'Votes', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))' }
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="votes" 
                    radius={[6, 6, 0, 0]}
                    fill="hsl(var(--primary))"
                    className="transition-all duration-300 hover:opacity-80"
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={`url(#gradient-${index})`}
                        className="transition-all duration-300 hover:opacity-90"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Enhanced detailed results */}
            {showDetailedView && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-foreground">Detailed Results</h4>
                  <span className="text-xs text-muted-foreground">
                    {chartData.length} option{chartData.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="grid gap-3">
                  {chartData.map((option, index) => (
                    <div 
                      key={option.id} 
                      className="group relative overflow-hidden rounded-lg border border-border/50 bg-card/50 p-4 transition-all duration-300 hover:border-border hover:bg-card/80 hover:shadow-md"
                    >
                      {/* Progress bar background */}
                      <div 
                        className="absolute inset-0 transition-all duration-500 ease-out"
                        style={{
                          background: `linear-gradient(90deg, ${option.color}15 0%, ${option.color}08 ${option.percentage}%, transparent ${option.percentage}%)`,
                        }}
                      />
                      
                      <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div 
                            className="w-4 h-4 rounded-full border-2 border-background shadow-sm transition-transform duration-300 group-hover:scale-110"
                            style={{ backgroundColor: option.color }}
                          />
                          <div className="min-w-0 flex-1">
                            <span className="text-sm font-medium text-foreground block truncate">
                              {option.fullName}
                            </span>
                            {index === 0 && pollResults!.totalVotes > 0 && (
                              <span className="text-xs text-primary font-medium flex items-center gap-1 mt-1">
                                <TrendingUp className="h-3 w-3" />
                                Leading
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-foreground">
                              {option.percentage}%
                            </span>
                            <span className="text-sm text-muted-foreground">
                              ({option.votes} vote{option.votes !== 1 ? 's' : ''})
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          // Enhanced empty state
          <div className="flex flex-col items-center justify-center h-80 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
              <BarChart className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-semibold text-foreground">No votes yet</p>
              <p className="text-sm text-muted-foreground max-w-md">
                Be the first to vote on this poll and see the results come to life!
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
