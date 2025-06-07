import React from 'react';
import { X, Moon, Sun, Globe, MessageSquare } from 'lucide-react';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Label } from './ui/label';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [darkMode, setDarkMode] = React.useState(false);
  const [internetAccess, setInternetAccess] = React.useState(true);
  const [messageHistory, setMessageHistory] = React.useState(true);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Settings</h3>
        <Button
          size="icon"
          variant="ghost"
          onClick={onClose}
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
        >
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {darkMode ? (
              <Moon className="w-3 h-3 text-muted-foreground" />
            ) : (
              <Sun className="w-3 h-3 text-muted-foreground" />
            )}
            <Label htmlFor="dark-mode" className="text-xs">Dark Mode</Label>
          </div>
          <Switch
            id="dark-mode"
            checked={darkMode}
            onCheckedChange={setDarkMode}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-3 h-3 text-muted-foreground" />
            <Label htmlFor="internet-access" className="text-xs">Internet Access</Label>
          </div>
          <Switch
            id="internet-access"
            checked={internetAccess}
            onCheckedChange={setInternetAccess}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-3 h-3 text-muted-foreground" />
            <Label htmlFor="message-history" className="text-xs">Message History</Label>
          </div>
          <Switch
            id="message-history"
            checked={messageHistory}
            onCheckedChange={setMessageHistory}
          />
        </div>
      </div>
    </div>
  );
}