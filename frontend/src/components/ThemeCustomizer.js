import React, { useState } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { useTheme } from '@/lib/ThemeContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Palette, Monitor, Zap, Box, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function ThemeCustomizer() {
  const { theme, setTheme, setAiTheme } = useTheme();
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingTheme, setIsGeneratingTheme] = useState(false);

  const themes = [
    { id: 'matrix', name: 'Matrix Arcade', icon: <Monitor className="h-5 w-5" />, desc: 'Cyberpunk retro style' },
    { id: 'glass', name: 'Glassmorphism', icon: <Box className="h-5 w-5" />, desc: 'Modern frosted glass' },
    { id: 'neubrutalism', name: 'Neubrutalism', icon: <Zap className="h-5 w-5" />, desc: 'Bold, high contrast' },
  ];

  const handleGenerateAiTheme = async () => {
    setIsGeneratingTheme(true);
    try {
      const response = await axios.post(`${API}/theme/generate`, {
        prompt: aiPrompt,
        mode: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
      });

      const generated = response?.data;
      if (!generated?.variables) {
        throw new Error('Invalid AI theme response');
      }

      setAiTheme(generated);
      setTheme('ai');
      toast.success(`Applied AI Theme: ${generated.theme_name || 'Custom Theme'}`);
    } catch (error) {
      console.error('Failed to generate AI theme', error);
      toast.error(error?.response?.data?.detail || 'Failed to generate AI theme');
    } finally {
      setIsGeneratingTheme(false);
    }
  };

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
                <div className="absolute top-3 right-3 h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_var(--accent-primary)]" />
              )}
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-primary/30 bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <p className="font-bold text-sm">AI Theme Generator (Grok)</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Generate a fresh custom theme from a prompt. You can re-run it anytime.
          </p>
          <Input
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="e.g. icy blue futuristic studio with soft neon accents"
          />
          <Button
            className="w-full"
            onClick={handleGenerateAiTheme}
            disabled={isGeneratingTheme}
          >
            {isGeneratingTheme ? 'Generating Theme...' : 'Generate AI Theme'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
