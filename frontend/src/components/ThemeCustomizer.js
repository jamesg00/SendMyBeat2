import React from 'react';
import { useTheme } from '@/lib/ThemeContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Palette, Monitor, Zap } from 'lucide-react';

export default function ThemeCustomizer() {
  const { theme, setTheme } = useTheme();

  const themes = [
    { id: 'matrix', name: 'Matrix Arcade', icon: <Monitor className="h-5 w-5" />, desc: 'Cyberpunk retro style' },
    { id: 'neubrutalism', name: 'Neubrutalism', icon: <Zap className="h-5 w-5" />, desc: 'Bold, high contrast' },
  ];

  return (
    <Card className="dashboard-card terminal-panel-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Palette className="h-5 w-5 text-[var(--accent-primary)]" />
          Theme Maker
        </CardTitle>
        <CardDescription>Customize the look and feel of your studio</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={
                `relative p-4 border text-left transition-colors duration-150 flex flex-col gap-2 ${
                  theme === t.id
                    ? 'border-[var(--accent-primary)] bg-[var(--bg-secondary)]'
                    : 'border-[var(--border-color)] hover:border-[var(--accent-primary)] bg-[var(--bg-secondary)]'
                }`
              }
            >
              <div className={`p-2 w-fit ${theme === t.id ? 'text-[var(--accent-primary)]' : 'text-white'}`}>
                {t.icon}
              </div>
              <div>
                <p className="font-bold text-sm">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.desc}</p>
              </div>
              {theme === t.id ? (
                <div className="absolute top-3 right-3 h-2 w-2 bg-[var(--accent-primary)]" />
              ) : null}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
