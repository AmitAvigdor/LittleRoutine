import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Toggle } from '@/components/ui/Toggle';
import { SegmentedControl } from '@/components/ui/Select';
import { useAppStore } from '@/stores/appStore';
import { updateSettings } from '@/lib/firestore';
import { VolumeUnit, WeightUnit, LengthUnit } from '@/types';
import { toast } from '@/stores/toastStore';
import { User, Moon, Bell, Scale } from 'lucide-react';

export function SettingsView() {
  const { settings, setSettings } = useAppStore();
  const [saving, setSaving] = useState(false);

  // Local state for immediate UI updates
  const [userName, setUserName] = useState(settings?.userName || '');
  const [partnerName, setPartnerName] = useState(settings?.partnerName || '');

  useEffect(() => {
    if (settings) {
      setUserName(settings.userName || '');
      setPartnerName(settings.partnerName || '');
    }
  }, [settings]);

  const handleSettingChange = async <K extends keyof NonNullable<typeof settings>>(
    key: K,
    value: NonNullable<typeof settings>[K]
  ) => {
    if (!settings) return;

    // Store previous value for rollback
    const previousValue = settings[key];

    // Optimistic update
    setSettings({ ...settings, [key]: value });
    setSaving(true);

    try {
      await updateSettings(settings.id, { [key]: value });
    } catch (error) {
      console.error('Error updating settings:', error);
      // Rollback on error
      setSettings({ ...settings, [key]: previousValue });
      toast.error('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleNameBlur = async () => {
    if (settings && userName !== settings.userName) {
      await handleSettingChange('userName', userName || null);
    }
  };

  const handlePartnerNameBlur = async () => {
    if (settings && partnerName !== settings.partnerName) {
      await handleSettingChange('partnerName', partnerName || null);
    }
  };

  if (!settings) {
    return (
      <div>
        <Header title="Settings" showBabySwitcher={false} />
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Settings" showBabySwitcher={false} />

      <div className="px-4 py-4 space-y-4">
        {/* User Info */}
        <Card>
          <CardHeader
            title="User Info"
            subtitle="Personalize your experience"
          />
          <div className="space-y-3">
            <Input
              label="Your Name"
              placeholder="Enter your name"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              onBlur={handleNameBlur}
              icon={<User className="w-5 h-5" />}
            />
            <Input
              label="Partner's Name"
              placeholder="Enter partner's name"
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
              onBlur={handlePartnerNameBlur}
              icon={<User className="w-5 h-5" />}
            />
          </div>
        </Card>

        {/* Units */}
        <Card>
          <CardHeader
            title="Preferred Units"
            subtitle="Set your measurement preferences"
          />
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Volume
              </label>
              <SegmentedControl
                options={[
                  { value: 'oz', label: 'oz (ounces)' },
                  { value: 'ml', label: 'ml (milliliters)' },
                ]}
                value={settings.preferredVolumeUnit}
                onChange={(value) => handleSettingChange('preferredVolumeUnit', value as VolumeUnit)}
                fullWidth
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Weight
              </label>
              <SegmentedControl
                options={[
                  { value: 'lbs', label: 'lbs (pounds)' },
                  { value: 'kg', label: 'kg (kilograms)' },
                ]}
                value={settings.preferredWeightUnit}
                onChange={(value) => handleSettingChange('preferredWeightUnit', value as WeightUnit)}
                fullWidth
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Length
              </label>
              <SegmentedControl
                options={[
                  { value: 'in', label: 'in (inches)' },
                  { value: 'cm', label: 'cm (centimeters)' },
                ]}
                value={settings.preferredLengthUnit}
                onChange={(value) => handleSettingChange('preferredLengthUnit', value as LengthUnit)}
                fullWidth
              />
            </div>
          </div>
        </Card>

        {/* Night Mode */}
        <Card>
          <CardHeader
            title="Night Mode"
            subtitle="Reduce eye strain at night"
          />
          <div className="space-y-4">
            <Toggle
              checked={settings.nightModeEnabled}
              onChange={(checked) => handleSettingChange('nightModeEnabled', checked)}
              label="Enable Night Mode"
              description="Use dark colors for the interface"
            />

            <Toggle
              checked={settings.nightModeAutoEnabled}
              onChange={(checked) => handleSettingChange('nightModeAutoEnabled', checked)}
              label="Auto Night Mode"
              description={`Automatically enable from ${settings.nightModeStartHour}:00 to ${settings.nightModeEndHour}:00`}
            />

            <Toggle
              checked={settings.nightModeSilent}
              onChange={(checked) => handleSettingChange('nightModeSilent', checked)}
              label="Silent Mode at Night"
              description="Mute notifications during night hours"
            />
          </div>
        </Card>

        {/* Reminders */}
        <Card>
          <CardHeader
            title="Reminders"
            subtitle="Get notified about activities"
          />
          <div className="space-y-4">
            <Toggle
              checked={settings.feedingReminderEnabled}
              onChange={(checked) => handleSettingChange('feedingReminderEnabled', checked)}
              label="Feeding Reminders"
              description={`Remind every ${settings.feedingReminderInterval} hours`}
            />

            <Toggle
              checked={settings.diaperReminderEnabled}
              onChange={(checked) => handleSettingChange('diaperReminderEnabled', checked)}
              label="Diaper Reminders"
              description={`Remind every ${settings.diaperReminderInterval} hours`}
            />

            <Toggle
              checked={settings.medicineReminderEnabled}
              onChange={(checked) => handleSettingChange('medicineReminderEnabled', checked)}
              label="Medicine Reminders"
              description={`Remind ${settings.medicineReminderMinutesBefore} minutes before`}
            />

            <Toggle
              checked={settings.dailySummaryEnabled}
              onChange={(checked) => handleSettingChange('dailySummaryEnabled', checked)}
              label="Daily Summaries"
              description="Receive morning and evening activity summaries"
            />
          </div>
        </Card>

        {/* Version */}
        <p className="text-xs text-center text-gray-400 pt-4">
          LittleRoutine v1.0.0
        </p>
      </div>
    </div>
  );
}
