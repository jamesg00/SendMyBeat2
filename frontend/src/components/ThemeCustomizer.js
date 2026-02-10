import React from 'react';
import { useTheme } from '@/lib/ThemeContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Palette, Monitor, Zap, Grid, Box } from 'lucide-react';

export default function ThemeCustomizer() {
  const { theme, setTheme } = useTheme();

  const themes = [
    { id: 'matrix', name: 'Matrix Arcade', icon: <Monitor className="h-5 w-5" />, desc: 'Cyberpunk retro style' },
    { id: 'glass', name: 'Glassmorphism', icon: <Box className="h-5 w-5" />, desc: 'Modern frosted glass' },
    { id: 'neubrutalism', name: 'Neubrutalism', icon: <Zap className="h-5 w-5" />, desc: 'Bold, high contrast' },
    { id: 'minimal', name: 'Clean Minimal', icon: <Grid className="h-5 w-5" />, desc: 'Simple & professional' },
  ];

  return (
    <Card className="dashboard-card border-l-4 border-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Palette className="h-5 w-5 text-primary" />
          Theme Maker
        </CardTitle>
        <CardDescription>Customize the look and feel of your studio</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`
                relative p-4 rounded-xl border-2 text-left transition-all duration-200
                hover:scale-105 flex flex-col gap-2
                ${theme === t.id
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                  : 'border-muted hover:border-primary/50 bg-card'}
              `}
            >
              <div className={`p-2 rounded-lg w-fit ${theme === t.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {t.icon}
              </div>
              <div>
                <p className="font-bold text-sm">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.desc}</p>
              </div>
              {theme === t.id && (
                <div className="absolute top-3 right-3 h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
              )}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
