import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Toggle } from '@/components/ui/Toggle';
import { SegmentedControl } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useAppStore } from '@/stores/appStore';
import { updateSettings } from '@/lib/firestore';
import { VolumeUnit, WeightUnit, LengthUnit, FeedingTypePreference, LanguagePreference } from '@/types';
import { toast } from '@/stores/toastStore';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
} from '@/lib/notifications';
import { User, Moon, Bell, Scale, Baby, Milk, BellOff } from 'lucide-react';

export function SettingsView() {
  const { t } = useTranslation();
  const { settings, setSettings } = useAppStore();
  const [saving, setSaving] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(getNotificationPermission());

  // Local state for immediate UI updates
  const [userName, setUserName] = useState(settings?.userName || '');
  const [partnerName, setPartnerName] = useState(settings?.partnerName || '');

  useEffect(() => {
    if (settings) {
      setUserName(settings.userName || '');
      setPartnerName(settings.partnerName || '');
    }
  }, [settings]);

  const handleReminderToggle = async (
    key: 'feedingReminderEnabled' | 'diaperReminderEnabled' | 'medicineReminderEnabled',
    enabled: boolean
  ) => {
    if (enabled && notificationPermission !== 'granted') {
      // Request permission first
      const result = await requestNotificationPermission();
      setNotificationPermission(result);

      if (result !== 'granted') {
        toast.error(t('settings.enableNotificationsError'));
        return;
      }
    }

    await handleSettingChange(key, enabled);
    if (enabled) {
      toast.success(t('settings.reminderEnabled'));
    }
  };

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
      toast.error(t('settings.saveError'));
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
        <Header title={t('settings.title')} showBabySwitcher={false} />
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title={t('settings.title')} showBabySwitcher={false} />

      <div className="px-4 py-4 space-y-4">
        {/* User Info */}
        <Card>
          <CardHeader
            title={t('settings.userInfo')}
            subtitle={t('settings.userInfoSubtitle')}
          />
          <div className="space-y-3">
            <Input
              label={t('settings.yourName')}
              placeholder={t('settings.yourNamePlaceholder')}
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              onBlur={handleNameBlur}
              icon={<User className="w-5 h-5" />}
            />
            <Input
              label={t('settings.partnerName')}
              placeholder={t('settings.partnerNamePlaceholder')}
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
              onBlur={handlePartnerNameBlur}
              icon={<User className="w-5 h-5" />}
            />
          </div>
        </Card>

        {/* Language */}
        <Card>
          <CardHeader
            title={t('language.label')}
            subtitle={t('language.subtitle')}
          />
          <SegmentedControl
            options={[
              { value: 'system', label: t('language.system') },
              { value: 'he', label: t('language.hebrew') },
              { value: 'en', label: t('language.english') },
            ]}
            value={settings.languagePreference ?? 'system'}
            onChange={(value) => handleSettingChange('languagePreference', value as LanguagePreference)}
            fullWidth
          />
        </Card>

        {/* Units */}
        <Card>
          <CardHeader
            title={t('settings.units')}
            subtitle={t('settings.unitsSubtitle')}
          />
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('settings.volume')}
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
                {t('settings.weight')}
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
                {t('settings.length')}
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

        {/* Feeding Preference */}
        <Card>
          <CardHeader
            title={t('settings.feedingType')}
            subtitle={t('settings.feedingTypeSubtitle')}
          />
          <div>
            <SegmentedControl
              options={[
                { value: 'breastfeeding', label: t('settings.breastfeeding'), icon: <Baby className="w-4 h-4" /> },
                { value: 'formula', label: t('settings.formula'), icon: <Milk className="w-4 h-4" /> },
              ]}
              value={settings.feedingTypePreference}
              onChange={(value) => handleSettingChange('feedingTypePreference', value as FeedingTypePreference)}
              fullWidth
            />
          </div>
        </Card>

        {/* Night Mode */}
        <Card>
          <CardHeader
            title={t('settings.nightMode')}
            subtitle={t('settings.nightModeSubtitle')}
          />
          <div className="space-y-4">
            <Toggle
              checked={settings.nightModeEnabled}
              onChange={(checked) => handleSettingChange('nightModeEnabled', checked)}
              label={t('settings.enableNightMode')}
              description={t('settings.enableNightModeDescription')}
            />

            <Toggle
              checked={settings.nightModeAutoEnabled}
              onChange={(checked) => handleSettingChange('nightModeAutoEnabled', checked)}
              label={t('settings.autoNightMode')}
              description={t('settings.autoNightModeDescription', {
                start: settings.nightModeStartHour,
                end: settings.nightModeEndHour,
              })}
            />

            <Toggle
              checked={settings.nightModeSilent}
              onChange={(checked) => handleSettingChange('nightModeSilent', checked)}
              label={t('settings.silentNight')}
              description={t('settings.silentNightDescription')}
            />
          </div>
        </Card>

        {/* Reminders */}
        <Card>
          <CardHeader
            title={t('settings.reminders')}
            subtitle={t('settings.remindersSubtitle')}
          />
          <div className="space-y-4">
            {/* Permission warning banner */}
            {isNotificationSupported() && notificationPermission === 'denied' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3">
                <BellOff className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800">{t('settings.notificationsBlocked')}</p>
                  <p className="text-amber-700">{t('settings.notificationsBlockedDescription')}</p>
                </div>
              </div>
            )}

            {!isNotificationSupported() && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-start gap-3">
                <BellOff className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-gray-700">{t('settings.notificationsUnsupported')}</p>
                  <p className="text-gray-600">{t('settings.notificationsUnsupportedDescription')}</p>
                </div>
              </div>
            )}

            <Toggle
              checked={settings.feedingReminderEnabled}
              onChange={(checked) => handleReminderToggle('feedingReminderEnabled', checked)}
              label={t('settings.feedingReminders')}
              description={t('settings.feedingRemindersDescription', { hours: settings.feedingReminderInterval })}
            />

            {settings.feedingReminderEnabled && (
              <div className="ml-4 pl-4 border-l-2 border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('settings.reminderInterval')}
                </label>
                <SegmentedControl
                  options={[
                    { value: '2', label: '2h' },
                    { value: '3', label: '3h' },
                    { value: '4', label: '4h' },
                  ]}
                  value={settings.feedingReminderInterval.toString()}
                  onChange={(value) => handleSettingChange('feedingReminderInterval', parseInt(value, 10))}
                />
              </div>
            )}

            <Toggle
              checked={settings.diaperReminderEnabled}
              onChange={(checked) => handleReminderToggle('diaperReminderEnabled', checked)}
              label={t('settings.diaperReminders')}
              description={t('settings.diaperRemindersDescription', { hours: settings.diaperReminderInterval })}
            />

            {settings.diaperReminderEnabled && (
              <div className="ml-4 pl-4 border-l-2 border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('settings.reminderInterval')}
                </label>
                <SegmentedControl
                  options={[
                    { value: '2', label: '2h' },
                    { value: '3', label: '3h' },
                    { value: '4', label: '4h' },
                  ]}
                  value={settings.diaperReminderInterval.toString()}
                  onChange={(value) => handleSettingChange('diaperReminderInterval', parseInt(value, 10))}
                />
              </div>
            )}

            <Toggle
              checked={settings.medicineReminderEnabled}
              onChange={(checked) => handleReminderToggle('medicineReminderEnabled', checked)}
              label={t('settings.medicineReminders')}
              description={t('settings.medicineRemindersDescription', { minutes: settings.medicineReminderMinutesBefore })}
            />
          </div>
        </Card>

        {/* Version */}
        <p className="text-xs text-center text-gray-400 pt-4">
          {t('settings.version')}
        </p>
      </div>
    </div>
  );
}
